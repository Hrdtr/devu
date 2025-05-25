import { Buffer } from 'node:buffer'
import { ORPCError } from '@orpc/server'
import { z } from 'zod'
import { and, createId, desc, eq, ilike, lt, or, schema } from '@/database'
import { defineRoute, srv } from '@/utils'

const llmChatProfileSchema = z.object({
  id: z.uuidv7(),
  createdAt: z.date(),
  lastUpdatedAt: z.date().nullable(),
  name: z.string(),
  provider: z.string(),
  configuration: z.object({ baseUrl: z.string().optional() }),
  credentials: z.object({ apiKey: z.string().optional() }),
  model: z.string(),
  additionalSystemPrompt: z.string().nullable(),
})

export const llmChatProfile = srv
  .prefix('/profiles')
  .router({
    create: defineRoute({
      summary: 'Create',
      method: 'POST',
      path: '/',
      tags: ['LLM Chat: Profile'],
    }, os => os
      .input(z.object({
        name: z.string().min(1),
        provider: z.string().min(1),
        configuration: z.object({ baseUrl: z.string().min(1).optional() }),
        credentials: z.object({ apiKey: z.string().min(1).optional() }),
        model: z.string().min(1),
        additionalSystemPrompt: z.string().min(1).nullish(),
      }))
      .output(llmChatProfileSchema)
      .handler(async ({ context, input }) => {
        const { name, provider, configuration, credentials, model, additionalSystemPrompt } = input
        const data = await context.db
          .insert(schema.llmChatProfile)
          .values({
            id: createId(),
            name,
            provider,
            configuration,
            credentials,
            model,
            additionalSystemPrompt,
          })
          .returning()
          .then(res => res[0]!)

        return data
      })),

    list: defineRoute({
      summary: 'List',
      method: 'GET',
      path: '/',
      tags: ['LLM Chat: Profile'],
    }, os => os
      .input(z.object({
        search: z.string().nullish(),
        limit: z.coerce.number().min(1).max(99).or(z.coerce.number().min(-1).max(-1)).default(10),
        cursor: z.string().min(1).nullish(),
      }))
      .output(z.object({
        data: llmChatProfileSchema.array(),
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

        let data = await context.db.query.llmChatProfile.findMany({
          where: and(
            context.parsedCursor
              ? or(
                  lt(schema.llmChatProfile.lastUpdatedAt, new Date(context.parsedCursor.lastUpdatedAt)),
                  and(
                    eq(schema.llmChatProfile.lastUpdatedAt, new Date(context.parsedCursor.lastUpdatedAt)),
                    lt(schema.llmChatProfile.id, context.parsedCursor.id),
                  ),
                )
              : undefined,
            search
              ? ilike(schema.llmChatProfile.name, `%${search}%`)
              : undefined,
          ),
          orderBy: [desc(schema.llmChatProfile.lastUpdatedAt), desc(schema.llmChatProfile.id)],
          limit: limit === -1 ? undefined : limit,
        })
        if (data.length === 0) {
          data = await context.db
            .insert(schema.llmChatProfile)
            .values({
              id: createId(),
              name: 'Ollama - Llama3.2 (3b)',
              provider: 'ollama',
              configuration: {
                baseUrl: 'http://localhost:11434',
              },
              credentials: {},
              model: 'llama3.2:3b',
              additionalSystemPrompt: null,
            })
            .returning()
        }

        let nextCursor: string | null = null
        if (data.length === limit) {
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
      tags: ['LLM Chat: Profile'],
    }, os => os
      .input(z.object({ id: z.uuidv7() }))
      .output(llmChatProfileSchema)
      .handler(async ({ context, input }) => {
        const { id } = input

        const data = await context.db.query.llmChatProfile.findFirst({
          where: eq(schema.llmChatProfile.id, id),
        })
        if (!data) {
          throw new ORPCError('NOT_FOUND', { message: 'Profile not found.' })
        }

        return data
      })),

    update: defineRoute({
      summary: 'Update',
      method: 'PATCH',
      path: '/{+id}',
      tags: ['LLM Chat: Profile'],
    }, os => os
      .input(z.object({
        id: z.uuidv7(),
        ...z.object({
          name: z.string().min(1),
          provider: z.string().min(1),
          configuration: z.object({ baseUrl: z.string().min(1).optional() }),
          credentials: z.object({ apiKey: z.string().min(1).optional() }),
          model: z.string().min(1),
          additionalSystemPrompt: z.string().min(1).nullish(),
        }).partial().shape,
      }))
      .output(llmChatProfileSchema)
      .handler(async ({ context, input }) => {
        const { id, name, provider, configuration, credentials, model, additionalSystemPrompt } = input

        const profile = await context.db.query.llmChatProfile.findFirst({
          where: eq(schema.llmChatProfile.id, id),
          columns: { id: true },
        })
        if (!profile) {
          throw new ORPCError('NOT_FOUND', { message: 'Profile not found.' })
        }

        const data = await context.db
          .update(schema.llmChatProfile)
          .set({
            name,
            provider,
            configuration,
            credentials,
            model,
            additionalSystemPrompt,
          })
          .where(eq(schema.llmChatProfile.id, profile.id))
          .returning()
          .then(res => res[0]!)

        return data
      })),

    delete: defineRoute({
      summary: 'Delete',
      method: 'DELETE',
      path: '/{id}',
      tags: ['LLM Chat: Profile'],
      successStatus: 204,
    }, os => os
      .input(z.object({ id: z.uuidv7() }))
      .output(z.null())
      .handler(async ({ context, input }) => {
        const { id } = input

        const profile = await context.db.query.llmChatProfile.findFirst({
          where: eq(schema.llmChatProfile.id, id),
          columns: { id: true },
        })
        if (!profile) {
          throw new ORPCError('NOT_FOUND', { message: 'Profile not found.' })
        }

        await context.db
          .delete(schema.llmChatProfile)
          .where(eq(schema.llmChatProfile.id, profile.id))

        return null
      })),
  })
