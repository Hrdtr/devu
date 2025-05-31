import type { StreamTextResult } from 'ai'
import type { InferSelectModel } from 'drizzle-orm'
import type { SnakeCase } from 'scule'
import type { DB } from '@/database'
import { Buffer } from 'node:buffer'
import { eventIterator, ORPCError } from '@orpc/server'
import { APICallError } from 'ai'
import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod/v4'
import { and, createId, desc, eq, min, schema, sql } from '@/database'
import { defineRoute, srv } from '@/utils'
import { llmChat } from '@/utils/llm-chat'

const llmChatMessageSchema = createSelectSchema(schema.llmChatMessage)

const activeGenerations = new Set<string>()

export const llmChatMessage = srv
  .prefix('/messages')
  .router({
    create: defineRoute({
      summary: 'Send',
      method: 'POST',
      path: '/',
      tags: ['LLM Chat: Message'],
    }, os => os
      .input(z.object({
        content: z.string().min(1),
        chatId: z.uuidv7(),
        parentId: z.uuidv7().nullish(),
        profileId: z.uuidv7(),
        tools: z.object({
          invokeUtility: z.boolean().optional(),
        }).optional(),
      }))
      .output(eventIterator(z.union([
        z.object({ action: z.literal('push_message'), data: llmChatMessageSchema }),
        z.object({ action: z.literal('append_message_content_chunk'), data: z.object({ messageId: z.uuidv7(), chunk: z.string() }) }),
        z.object({ action: z.literal('tool_invoke'), data: z.string() }),
        z.object({ action: z.literal('set_chat_title'), data: z.string() }),
      ])))
      .handler(async function* ({ context, input, signal }) {
        const { content, chatId, parentId, profileId } = input

        // Load chat and profile data
        const [chat, messagesCount, humanMessageParent, profile] = await Promise.all([
          context.db.query.llmChat.findFirst({ where: (field, { eq }) => eq(field.id, chatId) }),
          context.db.$count(schema.llmChatMessage, eq(schema.llmChatMessage.chatId, chatId)),
          parentId
            ? context.db.query.llmChatMessage.findFirst({ where: (field, { eq }) => eq(field.id, parentId) })
            : Promise.resolve(undefined),
          context.db.query.llmChatProfile.findFirst({ where: (field, { eq }) => eq(field.id, profileId) }),
        ])
        if (!chat) {
          throw new ORPCError('NOT_FOUND', { message: 'Chat not found' })
        }
        if (!profile) {
          throw new ORPCError('NOT_FOUND', { message: 'Profile not found' })
        }

        const agent = llmChat.createAgent(profile, { tools: input.tools })

        let humanMessage: Message | undefined
        let assistantMessage: Message | undefined
        let llmStream: StreamTextResult<any, unknown> | undefined
        let llmStreamFinished = false
        let newChatTitle: string | undefined

        try {
          const humanMessageId = messagesCount === 0 ? chat.rootMessageId : createId()
          const assistantMessageId = createId()
          const branch = humanMessageParent?.branch || createId()

          humanMessage = {
            id: humanMessageId,
            createdAt: new Date(),
            chatId,
            parentId: humanMessageParent?.id || null,
            role: 'human',
            content,
            branch,
            metadata: {},
          }
          yield { action: 'push_message', data: humanMessage }
          await context.db.insert(schema.llmChatMessage).values(humanMessage)

          assistantMessage = {
            id: assistantMessageId,
            createdAt: new Date(),
            chatId: chat.id,
            parentId: humanMessageId,
            role: 'assistant',
            content: '', // Start with empty content
            branch,
            metadata: {
              provider: profile.provider,
              model: profile.model,
            },
          }
          yield { action: 'push_message', data: assistantMessage }

          // Load existing messages by provided branch to construct history explicitly
          const { data: messages } = await loadMessages(context.db, chatId, {
            branch: humanMessageParent?.branch || null,
            limit: 10,
          })
          const history = [
            ...messages.map(message => message.role === 'human'
              ? new llmChat.Message({ role: 'user', content: message.content })
              : new llmChat.Message({ role: 'assistant', content: message.content }),
            ),
          ]

          activeGenerations.add(assistantMessage.id)

          llmStream = await agent.stream(history, {
            resourceId: chat.id,
            threadId: branch,
            abortSignal: signal,
          })
          for await (const chunk of llmStream.fullStream) {
            if (signal?.aborted || !activeGenerations.has(assistantMessage.id)) {
              return
            }

            if (chunk.type === 'text-delta') {
              assistantMessage.content += chunk.textDelta
              yield {
                action: 'append_message_content_chunk',
                data: {
                  messageId: assistantMessage.id,
                  chunk: chunk.textDelta,
                },
              }
            }
            if (chunk.type === 'tool-call') {
              yield {
                action: 'tool_invoke',
                data: chunk.toolName,
              }
            }
            if (chunk.type === 'error') {
              const error = chunk.error
              const errorMessage = `${assistantMessage.content.length > 0 ? `\n---\n\n` : ''}<p class="text-destructive-foreground">${error instanceof Error ? (error instanceof APICallError ? (error.responseBody || error.message) : error.message) : String(error)}</p>\n`
              assistantMessage.content += assistantMessage.content.length > 0 ? `\n\n${errorMessage}` : errorMessage
              yield {
                action: 'append_message_content_chunk',
                data: {
                  messageId: assistantMessage.id,
                  chunk: errorMessage,
                },
              }
            }
          }

          llmStreamFinished = true
          if (!chat.title) {
            const result = await agent.generate([
              ...history,
              new llmChat.Message({ role: 'assistant', content: assistantMessage.content }),
              new llmChat.Message({ role: 'user', content: 'SYSTEM INSTRUCTION:\nGenerate a concise title for this conversation. Reply with only the title, avoiding special characters, formatting, or prefixes like \'A conversation...\'. Maximum length: 100 characters.' }),
            ])
            const rawTitle = result.text
              .replace(/<think>[\s\S]*?<\/think>/gi, '') // Remove <think>...</think> blocks if any
              .trim()
            const isValid
              = rawTitle.length > 0
                && rawTitle.length <= 100
                && !/^a conversation/i.test(rawTitle)
                && !/^conversation of/i.test(rawTitle)
                && /^[a-z0-9\s'":,.-]+$/i.test(rawTitle)

            const newChatTitle = rawTitle && isValid ? rawTitle : undefined
            if (newChatTitle) {
              yield { action: 'set_chat_title', data: newChatTitle }
            }
          }
        }
        catch (error) {
          throw new ORPCError('INTERNAL_SERVER_ERROR', {
            message: error instanceof Error ? (error instanceof APICallError ? (error.responseBody || error.message) : error.message) : String(error),
          })
        }
        finally {
          if (!llmStreamFinished) {
            if (assistantMessage) {
              const chunk = `${assistantMessage.content.length > 0 ? `\n---\n\n` : ''}<p class="text-muted-foreground">Stream stopped.</p>\n`
              if (activeGenerations.has(assistantMessage.id)) {
                activeGenerations.delete(assistantMessage.id)
              }
              assistantMessage.content += chunk
            }
          }

          if (assistantMessage) {
            await Promise.all([
              context.db.insert(schema.llmChatMessage).values(assistantMessage),
              ...(newChatTitle
                ? [context.db.update(schema.llmChat).set({ title: newChatTitle }).where(eq(schema.llmChat.id, chatId))]
                : []),
            ])
          }
        }
      })),

    list: defineRoute({
      summary: 'List',
      method: 'GET',
      path: '/',
      tags: ['LLM Chat: Message'],
    }, os => os
      .input(z.object({
        chatId: z.uuidv7(),
        branch: z.uuidv7().nullish(),
        untilId: z.uuidv7().nullish(),
        limit: z.coerce.number().min(1).max(99).or(z.coerce.number().min(-1).max(-1)).default(10),
        cursor: z.string().min(1).nullish(),
      }))
      .output(z.object({
        data: llmChatMessageSchema.array(),
        activeBranches: z.string().array(),
        nextCursor: z.string().nullable(),
      }))
      .use(async ({ next }, input) => {
        let parsedCursor: { createdAt: string, id: string } | null = null
        if (!input.cursor) {
          return next({ context: { parsedCursor } })
        }
        try {
          const json = Buffer.from(input.cursor, 'base64').toString('utf-8')
          parsedCursor = JSON.parse(json)
        }
        catch {
          throw new ORPCError('BAD_REQUEST', {
            message: 'Invalid pagination cursor.',
          })
        }
        return next({ context: { parsedCursor } })
      })
      .handler(async ({ context, input }) => {
        const { chatId, branch, limit, untilId } = input
        const { data, activeBranches, nextCursor } = await loadMessages(context.db, chatId, {
          branch,
          limit,
          cursor: context.parsedCursor,
          untilId,
        })
        return {
          data,
          activeBranches,
          nextCursor: nextCursor
            ? Buffer.from(JSON.stringify({
                createdAt: nextCursor.createdAt,
                id: nextCursor.id,
              })).toString('base64')
            : null,
        }
      })),

    regenerate: defineRoute({
      summary: 'Regenerate',
      method: 'POST',
      path: '/{id}',
      tags: ['LLM Chat: Message'],
    }, os => os
      .input(z.object({
        id: z.uuidv7(),
        profileId: z.uuidv7(),
        tools: z.object({
          invokeUtility: z.boolean().optional(),
        }).optional(),
      }))
      .output(eventIterator(z.union([
        z.object({ action: z.literal('push_message'), data: llmChatMessageSchema }),
        z.object({ action: z.literal('append_message_content_chunk'), data: z.object({ messageId: z.uuidv7(), chunk: z.string() }) }),
        z.object({ action: z.literal('truncate_messages_after'), data: z.string() }),
        z.object({ action: z.literal('tool_invoke'), data: z.string() }),
        z.object({ action: z.literal('switch_to_branch'), data: z.string() }),
      ])))
      .handler(async function* ({ context, input, signal }) {
        const { id, profileId } = input

        // Load chat and profile data
        const [message, profile] = await Promise.all([
          context.db.query.llmChatMessage.findFirst({ where: (field, { eq }) => eq(field.id, id) }),
          context.db.query.llmChatProfile.findFirst({ where: (field, { eq }) => eq(field.id, profileId) }),
        ])
        if (!message) {
          throw new ORPCError('NOT_FOUND', { message: 'Message not found' })
        }
        if (!profile) {
          throw new ORPCError('NOT_FOUND', { message: 'Profile not found' })
        }

        if (message.role !== 'assistant') {
          throw new ORPCError('BAD_REQUEST', { message: 'Cannot regenerate non-assistant message' })
        }

        const assistantMessageParent = message.parentId
          ? await context.db.query.llmChatMessage.findFirst({ where: (field, { eq }) => eq(field.id, message.parentId!) })
          : undefined
        if (!assistantMessageParent) {
          throw new ORPCError('NOT_FOUND', { message: 'Parent message not found' })
        }

        const agent = llmChat.createAgent(profile, { tools: input.tools })

        let assistantMessage: Message | undefined
        let llmStream: StreamTextResult<any, unknown> | undefined
        let llmStreamFinished = false

        try {
          const assistantMessageId = createId()
          const branch = createId()

          yield { action: 'truncate_messages_after', data: assistantMessageParent.id }

          assistantMessage = {
            id: assistantMessageId,
            createdAt: new Date(),
            chatId: message.chatId,
            parentId: assistantMessageParent.id,
            role: 'assistant',
            content: '', // Start with empty content
            branch,
            metadata: {
              provider: profile.provider,
              model: profile.model,
            },
          }
          yield { action: 'push_message', data: assistantMessage }

          // Load existing messages by provided branch to construct history explicitly
          const { data: messages } = await loadMessages(context.db, message.chatId, {
            branch: message.branch,
            limit: 10,
          })
          const historyEndIndex = messages.findIndex(msg => msg.id === assistantMessageParent.id)
          const history = [
            ...messages
              .slice(0, historyEndIndex + 1) // Include the parent message
              .map(message => message.role === 'human'
                ? new llmChat.Message({ role: 'user', content: message.content })
                : new llmChat.Message({ role: 'assistant', content: message.content }),
              ),
          ]

          activeGenerations.add(assistantMessage.id)

          llmStream = await agent.stream(history, {
            resourceId: message.chatId,
            threadId: branch,
            abortSignal: signal,
          })
          for await (const chunk of llmStream.fullStream) {
            if (signal?.aborted || !activeGenerations.has(assistantMessage.id)) {
              return
            }

            if (chunk.type === 'text-delta') {
              assistantMessage.content += chunk.textDelta
              yield {
                action: 'append_message_content_chunk',
                data: {
                  messageId: assistantMessage.id,
                  chunk: chunk.textDelta,
                },
              }
            }
            if (chunk.type === 'tool-call') {
              yield {
                action: 'tool_invoke',
                data: chunk.toolName,
              }
            }
            if (chunk.type === 'error') {
              const error = chunk.error
              const errorMessage = `${assistantMessage.content.length > 0 ? `\n---\n\n` : ''}<p class="text-destructive-foreground">${error instanceof Error ? (error instanceof APICallError ? (error.responseBody || error.message) : error.message) : String(error)}</p>\n`
              assistantMessage.content += assistantMessage.content.length > 0 ? `\n\n${errorMessage}` : errorMessage
              yield {
                action: 'append_message_content_chunk',
                data: {
                  messageId: assistantMessage.id,
                  chunk: errorMessage,
                },
              }
            }
          }

          llmStreamFinished = true
        }
        catch (error) {
          throw new ORPCError('INTERNAL_SERVER_ERROR', {
            message: error instanceof Error ? (error instanceof APICallError ? (error.responseBody || error.message) : error.message) : String(error),
          })
        }
        finally {
          if (!llmStreamFinished) {
            if (assistantMessage) {
              const chunk = `${assistantMessage.content.length > 0 ? `\n---\n\n` : ''}<p class="text-muted-foreground">Stream stopped.</p>\n`
              if (activeGenerations.has(assistantMessage.id)) {
                activeGenerations.delete(assistantMessage.id)
              }
              assistantMessage.content += chunk
            }
          }

          if (assistantMessage) {
            await context.db.insert(schema.llmChatMessage).values(assistantMessage)
            yield { action: 'switch_to_branch', data: assistantMessage.branch }
          }
        }
      })),

    update: defineRoute({
      summary: 'Update',
      method: 'PATCH',
      path: '/{id}',
      tags: ['LLM Chat: Message'],
    }, os => os
      .input(z.object({
        id: z.uuidv7(),
        content: z.string().min(1),
        profileId: z.uuidv7(),
        tools: z.object({
          invokeUtility: z.boolean().optional(),
        }).optional(),
      }))
      .output(eventIterator(z.union([
        z.object({ action: z.literal('push_message'), data: llmChatMessageSchema }),
        z.object({ action: z.literal('append_message_content_chunk'), data: z.object({ messageId: z.uuidv7(), chunk: z.string() }) }),
        z.object({ action: z.literal('truncate_messages_since'), data: z.string() }),
        z.object({ action: z.literal('tool_invoke'), data: z.string() }),
        z.object({ action: z.literal('switch_to_branch'), data: z.string() }),
      ])))
      .handler(async function* ({ context, input, signal }) {
        const { id, content, profileId } = input

        // Load chat and profile data
        const [message, profile] = await Promise.all([
          context.db.query.llmChatMessage.findFirst({ where: (field, { eq }) => eq(field.id, id) }),
          context.db.query.llmChatProfile.findFirst({ where: (field, { eq }) => eq(field.id, profileId) }),
        ])
        if (!message) {
          throw new ORPCError('NOT_FOUND', { message: 'Message not found' })
        }
        if (!profile) {
          throw new ORPCError('NOT_FOUND', { message: 'Profile not found' })
        }

        if (message.role !== 'human') {
          throw new ORPCError('BAD_REQUEST', { message: 'Cannot update non-human message' })
        }

        const humanMessageParent = message.parentId
          ? await context.db.query.llmChatMessage.findFirst({ where: (field, { eq }) => eq(field.id, message.parentId!) })
          : undefined

        const agent = llmChat.createAgent(profile, { tools: input.tools })

        let humanMessage: Message | undefined
        let assistantMessage: Message | undefined
        let llmStream: StreamTextResult<any, unknown> | undefined
        let llmStreamFinished = false

        try {
          const humanMessageId = createId()
          const assistantMessageId = createId()
          const branch = createId()

          humanMessage = {
            id: humanMessageId,
            createdAt: new Date(),
            chatId: message.chatId,
            parentId: humanMessageParent?.id || null,
            role: 'human',
            content,
            branch,
            metadata: {},
          }
          yield { action: 'truncate_messages_since', data: message.id }
          yield { action: 'push_message', data: humanMessage }
          await context.db.insert(schema.llmChatMessage).values(humanMessage)

          assistantMessage = {
            id: assistantMessageId,
            createdAt: new Date(),
            chatId: message.chatId,
            parentId: humanMessageId,
            role: 'assistant',
            content: '', // Start with empty content
            branch,
            metadata: {
              provider: profile.provider,
              model: profile.model,
            },
          }
          yield { action: 'push_message', data: assistantMessage }

          // Load existing messages by provided branch to construct history explicitly
          const { data: messages } = await loadMessages(context.db, message.chatId, {
            branch, // Use the new branch, updated human message will be included
            limit: 10,
          })
          const history = [
            ...messages
              .map(message => message.role === 'human'
                ? new llmChat.Message({ role: 'user', content: message.content })
                : new llmChat.Message({ role: 'assistant', content: message.content }),
              ),
          ]

          activeGenerations.add(assistantMessage.id)

          llmStream = await agent.stream(history, {
            resourceId: message.chatId,
            threadId: branch,
            abortSignal: signal,
          })
          for await (const chunk of llmStream.fullStream) {
            if (signal?.aborted || !activeGenerations.has(assistantMessage.id)) {
              return
            }

            if (chunk.type === 'text-delta') {
              assistantMessage.content += chunk.textDelta
              yield {
                action: 'append_message_content_chunk',
                data: {
                  messageId: assistantMessage.id,
                  chunk: chunk.textDelta,
                },
              }
            }
            if (chunk.type === 'tool-call') {
              yield {
                action: 'tool_invoke',
                data: chunk.toolName,
              }
            }
            if (chunk.type === 'error') {
              const error = chunk.error
              const errorMessage = `${assistantMessage.content.length > 0 ? `\n---\n\n` : ''}<p class="text-destructive-foreground">${error instanceof Error ? (error instanceof APICallError ? (error.responseBody || error.message) : error.message) : String(error)}</p>\n`
              assistantMessage.content += assistantMessage.content.length > 0 ? `\n\n${errorMessage}` : errorMessage
              yield {
                action: 'append_message_content_chunk',
                data: {
                  messageId: assistantMessage.id,
                  chunk: errorMessage,
                },
              }
            }
          }

          llmStreamFinished = true
        }
        catch (error) {
          throw new ORPCError('INTERNAL_SERVER_ERROR', {
            message: error instanceof Error ? (error instanceof APICallError ? (error.responseBody || error.message) : error.message) : String(error),
          })
        }
        finally {
          if (!llmStreamFinished) {
            if (assistantMessage) {
              const chunk = `${assistantMessage.content.length > 0 ? `\n---\n\n` : ''}<p class="text-muted-foreground">Stream stopped.</p>\n`
              if (activeGenerations.has(assistantMessage.id)) {
                activeGenerations.delete(assistantMessage.id)
              }
              assistantMessage.content += chunk
            }
          }

          if (assistantMessage) {
            await context.db.insert(schema.llmChatMessage).values(assistantMessage)
            yield { action: 'switch_to_branch', data: assistantMessage.branch }
          }
        }
      })),

    abortGeneration: defineRoute({
      summary: 'Abort Generation',
      method: 'POST',
      path: '/{id}/abort-generation',
      tags: ['LLM Chat: Message'],
    }, os => os
      .input(z.object({ id: z.uuidv7() }))
      .output(z.null())
      .handler(async ({ input }) => {
        const { id } = input

        if (!activeGenerations.has(id)) {
          throw new ORPCError('NOT_FOUND', { message: 'No active generation found.' })
        }
        activeGenerations.delete(id)
        return null
      })),

    branches: defineRoute({
      summary: 'Branches',
      method: 'GET',
      path: '/{id}/branches',
      tags: ['LLM Chat: Message'],
    }, os => os
      .input(z.object({ id: z.uuidv7() }))
      .output(z.uuidv7().array())
      .handler(async ({ context, input }) => {
        const { id } = input

        const message = await context.db.query.llmChatMessage.findFirst({
          where: eq(schema.llmChatMessage.id, id),
          columns: { id: true },
        })
        if (!message) {
          throw new ORPCError('NOT_FOUND', { message: 'Message not found.' })
        }

        const data = await context.db
          .select({
            branchId: schema.llmChatMessage.branch,
            createdAt: min(schema.llmChatMessage.createdAt).as('createdAt'),
          })
          .from(schema.llmChatMessage)
          .where(eq(schema.llmChatMessage.parentId, message.id))
          .groupBy(schema.llmChatMessage.branch)
          .orderBy(desc(min(schema.llmChatMessage.createdAt)))

        return data.map(row => row.branchId)
      })),
  })

type Message = InferSelectModel<typeof schema.llmChatMessage>

// Define a type for the cursor
interface MessageCursor {
  createdAt: string
  id: string
}

// Define a type for the options
interface LoadMessagesOptions {
  branch?: string | null
  limit?: number // -1 should be only used to fetch history for llm calls
  cursor?: MessageCursor | null // doesn't have effect if limit is false
  untilId?: string | null // new option: fetch all messages until this id
}

// Define the return type
interface LoadMessagesResult {
  data: Message[]
  activeBranches: string[]
  nextCursor: MessageCursor | null
}

type SnakeCasedPropertiesDeep<T> = {
  [K in keyof T as K extends string ? SnakeCase<K> : K]:
  T[K] extends (infer U)[]
    ? U extends Record<string, unknown>
      ? SnakeCasedPropertiesDeep<U>[]
      : T[K]
    : T[K] extends Record<string, unknown>
      ? SnakeCasedPropertiesDeep<T[K]>
      : T[K]
}

const DEFAULT_PAGE_LIMIT = 10

export async function loadMessages(
  db: DB,
  chatId: string,
  options: LoadMessagesOptions = {},
): Promise<LoadMessagesResult> {
  const { branch, limit: limitOption, cursor, untilId } = options
  const limit = limitOption ?? DEFAULT_PAGE_LIMIT

  const [chat, messagesCount] = await Promise.all([
    db.query.llmChat.findFirst({ where: (field, { eq }) => eq(field.id, chatId) }),
    db.$count(schema.llmChatMessage, eq(schema.llmChatMessage.chatId, chatId)),
  ])
  if (!chat) {
    throw new ORPCError('NOT_FOUND', { message: 'Chat not found.' })
  }

  const result: LoadMessagesResult = {
    data: [],
    activeBranches: [],
    nextCursor: null,
  }
  if (messagesCount === 0) {
    return result
  }

  const activeBranchesSet = new Set<string>()

  try {
    let anchorMessageInfo: { id: string, branchId: string | null } | null = null

    // 1. Determine the anchor message (newest message for the context)
    if (branch) {
      const branchLatest = await db
        .select({ id: schema.llmChatMessage.id, branchId: schema.llmChatMessage.branch })
        .from(schema.llmChatMessage)
        .where(
          and(
            eq(schema.llmChatMessage.chatId, chatId),
            eq(schema.llmChatMessage.branch, branch),
          ),
        )
        .orderBy(desc(schema.llmChatMessage.createdAt))
        .limit(1)
        .then(res => res[0])
      if (branchLatest) {
        anchorMessageInfo = { id: branchLatest.id, branchId: branchLatest.branchId }
      }
    }

    if (!anchorMessageInfo) {
      const overallLatest = await db
        .select({ id: schema.llmChatMessage.id, branchId: schema.llmChatMessage.branch })
        .from(schema.llmChatMessage)
        .where(eq(schema.llmChatMessage.chatId, chatId))
        .orderBy(desc(schema.llmChatMessage.createdAt))
        .limit(1)
        .then(res => res[0])
      if (overallLatest) {
        anchorMessageInfo = { id: overallLatest.id, branchId: overallLatest.branchId }
      }
    }

    if (!anchorMessageInfo && chat.rootMessageId) {
      const rootMessage = await db.query.llmChatMessage.findFirst({
        columns: { id: true, branch: true },
        where: eq(schema.llmChatMessage.id, chat.rootMessageId),
      })
      if (rootMessage) {
        anchorMessageInfo = { id: rootMessage.id, branchId: rootMessage.branch }
      }
    }

    // If no anchor message can be determined (e.g., truly empty chat), return empty results
    if (!anchorMessageInfo) {
      if (chat.rootMessageId) { // If rootMessageId was defined but not found
        console.error(`Root message ${chat.rootMessageId} for chat ${chat.id} not found in llmChatMessage table.`)
        throw new ORPCError('NOT_FOUND', { message: 'Chat root message not found.' })
      }
      // Chat is genuinely empty, return default empty result
      return result
    }

    if (anchorMessageInfo.branchId) {
      activeBranchesSet.add(anchorMessageInfo.branchId)
    }

    // 2. Construct the Recursive CTE Query
    // We use Drizzle's `sql` template and schema references for safety and correctness.
    // The CTE will gather all ancestors of the anchorMessageInfo.id
    let queryCondition = sql`TRUE` // Initial condition
    let limitClause = sql``

    if (untilId) {
      // Find all messages from the anchor message up to and including the untilId message.
      // The CTE (message_ancestors) is structured to include the 'untilId' message
      // by stopping the recursion after 'untilId' is processed (i.e., it won't fetch parents of 'untilId').
      // Therefore, the outer query does not need to, and should not, filter out 'untilId'.
      // By ensuring 'queryCondition' doesn't exclude 'untilId', it will be included in the results.
      // If 'queryCondition' was initialized to sql`TRUE` and no other specific filters apply
      // for the 'untilId' case in this outer query, 'queryCondition' can remain sql`TRUE`.
      // Explicitly setting it to TRUE here clarifies intent for the untilId case.
      queryCondition = sql`TRUE`

      // No need for LIMIT when using untilId, as the range is defined by anchor and untilId.
    }
    else {
      // Use the original cursor-based pagination
      if (cursor && limit !== -1) {
        // Important: cursor.createdAt should be an ISO string.
        // The id comparison is for tie-breaking if multiple messages have the exact same timestamp.
        const cursorDate = new Date(cursor.createdAt)
        queryCondition = sql`message_ancestors.created_at < ${cursorDate} OR (message_ancestors.created_at = ${cursorDate} AND message_ancestors.id < ${cursor.id})`
      }
      // Apply limit only if untilId is not provided and limit is not -1
      limitClause = limit === -1 ? sql`` : sql`LIMIT ${limit}`
    }

    // Define the recursive CTE query - using explicit column references
    const messagesQuery = sql`
  WITH RECURSIVE message_ancestors AS (
    -- Base case: start with the anchor message
    SELECT m.*
    FROM ${schema.llmChatMessage} AS m
    WHERE m.id = ${anchorMessageInfo.id}

    UNION ALL

    -- Recursive case: join with parent messages
    SELECT p.*
    FROM ${schema.llmChatMessage} AS p
    JOIN message_ancestors ma ON p.id = ma.parent_id
    WHERE 
      ma.parent_id IS NOT NULL -- Critical for termination: ensure there's a parent to join with.
      -- If untilId is provided, this condition stops the recursion:
      -- It fetches parents (p.*) as long as the current message (ma) is NOT untilId.
      -- This means 'untilId' itself gets included from the previous step, but its parent does not.
      ${untilId ? sql`AND ma.id != ${untilId}` : sql``} 
  )
  SELECT * FROM message_ancestors
  WHERE ${queryCondition} -- For the untilId case, this will now be WHERE TRUE (or other general conditions if any)
  ORDER BY created_at DESC, id DESC
  ${limitClause}
`

    // 3. Execute Query
    const fetchedResult = await db.execute<SnakeCasedPropertiesDeep<Message>>(messagesQuery)
    const messagesInPage = fetchedResult.rows

    // 4. Process Results and Determine Next Cursor
    if (messagesInPage && messagesInPage.length > 0) {
      const oldestMessageInPage = messagesInPage[messagesInPage.length - 1]!
      result.nextCursor = {
        createdAt: new Date(oldestMessageInPage.created_at).toISOString(),
        id: oldestMessageInPage.id,
      }

      // Add branchIds from the current page to activeBranchesSet
      messagesInPage.forEach(msg => activeBranchesSet.add(msg.branch))
      // Reverse the array to get chronological order for the client
      result.data = messagesInPage.reverse().map(msg => ({
        id: msg.id,
        createdAt: new Date(msg.created_at),
        chatId: msg.chat_id,
        parentId: msg.parent_id,
        role: msg.role,
        content: msg.content,
        branch: msg.branch,
        metadata: {
          provider: msg.metadata.provider,
          model: msg.metadata.model,
        },
      }))
    }

    result.activeBranches = Array.from(activeBranchesSet)
    return result
  }
  catch (error) {
    console.error('Error loading messages:', error)
    if (error instanceof ORPCError) {
      throw error
    }
    throw new ORPCError('INTERNAL_SERVER_ERROR', { message: 'Error loading messages.' })
  }
}
