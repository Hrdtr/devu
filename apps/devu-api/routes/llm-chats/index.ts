import { Buffer } from 'node:buffer'
import { ORPCError } from '@orpc/server'
import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod/v4'
import { and, createId, desc, eq, lt, or, schema, sql } from '@/database'
import { defineRoute, srv } from '@/utils'
import { llmChatEmbeddingProfile } from './embedding-profiles'
import { llmChatMessage } from './messages'
import { llmChatProfile } from './profiles'

const llmChatSchema = createSelectSchema(schema.llmChat)

export const llmChat = srv
  .prefix('/llm-chats')
  .router({
    create: defineRoute({
      summary: 'Create',
      method: 'POST',
      path: '/',
      tags: ['LLM Chat'],
    }, os => os
      .output(llmChatSchema)
      .handler(async ({ context }) => {
        const data = await context.db
          .insert(schema.llmChat)
          .values({ id: createId(), rootMessageId: createId() })
          .returning()
          .then(res => res[0]!)

        return data
      })),

    list: defineRoute({
      summary: 'List',
      method: 'GET',
      path: '/',
      tags: ['LLM Chat'],
    }, os => os
      .input(z.object({
        search: z.string().nullish(),
        limit: z.coerce.number().min(1).max(99).or(z.coerce.number().min(-1).max(-1)).default(10),
        cursor: z.string().min(1).nullish(),
      }))
      .output(z.object({
        data: llmChatSchema.array(),
        nextCursor: z.string().nullable(),
      }))
      .use(async ({ next }, input) => {
        let parsedCursor: { lastUpdatedAt: string, id: string } | null = null
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
        const { search, limit } = input

        const data = await context.db.query.llmChat.findMany({
          where: and(
            context.parsedCursor
              ? or(
                  lt(schema.llmChat.lastUpdatedAt, new Date(context.parsedCursor.lastUpdatedAt)),
                  and(
                    eq(schema.llmChat.lastUpdatedAt, new Date(context.parsedCursor.lastUpdatedAt)),
                    lt(schema.llmChat.id, context.parsedCursor.id),
                  ),
                )
              : undefined,
            search
              ? sql`${schema.llmChat.title} LIKE ${`%${search}%`} COLLATE NOCASE`
              : undefined,
          ),
          orderBy: [desc(schema.llmChat.lastUpdatedAt), desc(schema.llmChat.id)],
          limit: limit === -1 ? undefined : limit,
        })

        let nextCursor: string | null = null
        if (limit !== -1 && data.length === limit) {
          const lastDataEntry = data[data.length - 1]!
          nextCursor = Buffer.from(JSON.stringify({
            lastUpdatedAt: lastDataEntry.lastUpdatedAt.toISOString(),
            id: lastDataEntry.id,
          })).toString('base64')
        }

        return {
          data,
          nextCursor,
        }
      })),

    retrieve: defineRoute({
      summary: 'Retrieve',
      method: 'GET',
      path: '/{id}',
      tags: ['LLM Chat'],
    }, os => os
      .input(z.object({ id: z.uuidv7() }))
      .output(llmChatSchema)
      .handler(async ({ context, input }) => {
        const { id } = input

        const data = await context.db.query.llmChat.findFirst({
          where: eq(schema.llmChat.id, id),
        })
        if (!data) {
          throw new ORPCError('NOT_FOUND', { message: 'Chat not found.' })
        }

        return data
      })),

    update: defineRoute({
      summary: 'Update',
      method: 'PATCH',
      path: '/{id}',
      tags: ['LLM Chat'],
    }, os => os
      .input(z.object({
        id: z.uuidv7(),
        title: z.string().min(1).nullish(),
        activeBranches: z.string().array().min(1).optional(),
      }))
      .output(llmChatSchema)
      .handler(async ({ context, input }) => {
        const { id, title, activeBranches } = input

        const chat = await context.db.query.llmChat.findFirst({
          where: eq(schema.llmChat.id, id),
          columns: { id: true, title: true, activeBranches: true },
        })
        if (!chat) {
          throw new ORPCError('NOT_FOUND', { message: 'Chat not found.' })
        }

        const data = await context.db
          .update(schema.llmChat)
          .set({
            lastUpdatedAt: (
              (title !== undefined && chat.title !== title)
              || (activeBranches !== undefined && JSON.stringify(chat.activeBranches) !== JSON.stringify(activeBranches))
            )
              ? new Date()
              : undefined,
            title,
            activeBranches,
          })
          .where(eq(schema.llmChat.id, chat.id))
          .returning()
          .then(res => res[0]!)

        return data
      })),

    delete: defineRoute({
      summary: 'Delete',
      method: 'DELETE',
      path: '/{id}',
      tags: ['LLM Chat'],
      successStatus: 204,
    }, os => os
      .input(z.object({ id: z.uuidv7() }))
      .output(z.null())
      .handler(async ({ context, input }) => {
        const { id } = input

        const chat = await context.db.query.llmChat.findFirst({
          where: eq(schema.llmChat.id, id),
          columns: { id: true },
        })
        if (!chat) {
          throw new ORPCError('NOT_FOUND', { message: 'Chat not found.' })
        }

        await context.db
          .delete(schema.llmChat)
          .where(eq(schema.llmChat.id, chat.id))

        return null
      })),

    profile: llmChatProfile,
    message: llmChatMessage,
    embeddingProfile: llmChatEmbeddingProfile,
  })
