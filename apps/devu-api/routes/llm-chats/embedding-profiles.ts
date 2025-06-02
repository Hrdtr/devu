import { Buffer } from 'node:buffer'
import { ORPCError } from '@orpc/server'
import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod/v4'
import { and, createId, desc, eq, lt, or, schema, sql } from '@/database'
import { defineRoute, srv } from '@/utils'

const llmChatEmbeddingProfileSchema = createSelectSchema(schema.llmChatEmbeddingProfile)

export const llmChatEmbeddingProfile = srv
  .prefix('/embedding-profiles')
  .router({
    create: defineRoute({
      summary: 'Create',
      method: 'POST',
      path: '/',
      tags: ['LLM Chat: Embedding Profile'],
    }, os => os
      .input(z.object({
        name: z.string().min(1),
        provider: z.string().min(1),
        configuration: z.object({ baseUrl: z.string().min(1).optional() }),
        credentials: z.object({ apiKey: z.string().min(1).optional() }),
        model: z.string().min(1),
      }))
      .output(llmChatEmbeddingProfileSchema)
      .handler(async ({ context, input }) => {
        const { name, provider, configuration, credentials, model } = input
        const data = await context.db
          .insert(schema.llmChatEmbeddingProfile)
          .values({
            id: createId(),
            name,
            provider,
            configuration,
            credentials,
            model,
          })
          .returning()
          .then(res => res[0]!)

        return data
      })),

    list: defineRoute({
      summary: 'List',
      method: 'GET',
      path: '/',
      tags: ['LLM Chat: Embedding Profile'],
    }, os => os
      .input(z.object({
        search: z.string().nullish(),
        limit: z.coerce.number().min(1).max(99).or(z.coerce.number().min(-1).max(-1)).default(10),
        cursor: z.string().min(1).nullish(),
      }))
      .output(z.object({
        data: llmChatEmbeddingProfileSchema.array(),
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

        const data = await context.db.query.llmChatEmbeddingProfile.findMany({
          where: and(
            context.parsedCursor
              ? or(
                  lt(schema.llmChatEmbeddingProfile.lastUpdatedAt, new Date(context.parsedCursor.lastUpdatedAt)),
                  and(
                    eq(schema.llmChatEmbeddingProfile.lastUpdatedAt, new Date(context.parsedCursor.lastUpdatedAt)),
                    lt(schema.llmChatEmbeddingProfile.id, context.parsedCursor.id),
                  ),
                )
              : undefined,
            search
              ? sql`${schema.llmChatEmbeddingProfile.name} LIKE ${`%${search}%`} COLLATE NOCASE`
              : undefined,
          ),
          orderBy: [desc(schema.llmChatEmbeddingProfile.lastUpdatedAt), desc(schema.llmChatEmbeddingProfile.id)],
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
      tags: ['LLM Chat: Embedding Profile'],
    }, os => os
      .input(z.object({ id: z.uuidv7() }))
      .output(llmChatEmbeddingProfileSchema)
      .handler(async ({ context, input }) => {
        const { id } = input

        const data = await context.db.query.llmChatEmbeddingProfile.findFirst({
          where: eq(schema.llmChatEmbeddingProfile.id, id),
        })
        if (!data) {
          throw new ORPCError('NOT_FOUND', { message: 'Embedding Profile not found.' })
        }

        return data
      })),

    update: defineRoute({
      summary: 'Update',
      method: 'PATCH',
      path: '/{id}',
      tags: ['LLM Chat: Embedding Profile'],
    }, os => os
      .input(z.object({
        id: z.uuidv7(),
        ...z.object({
          name: z.string().min(1),
          provider: z.string().min(1),
          configuration: z.object({ baseUrl: z.string().min(1).optional() }),
          credentials: z.object({ apiKey: z.string().min(1).optional() }),
          model: z.string().min(1),
        }).partial().shape,
      }))
      .output(llmChatEmbeddingProfileSchema)
      .handler(async ({ context, input }) => {
        const { id, name, provider, configuration, credentials, model } = input

        const profile = await context.db.query.llmChatEmbeddingProfile.findFirst({
          where: eq(schema.llmChatEmbeddingProfile.id, id),
          columns: { id: true },
        })
        if (!profile) {
          throw new ORPCError('NOT_FOUND', { message: 'Embedding Profile not found.' })
        }

        const data = await context.db
          .update(schema.llmChatEmbeddingProfile)
          .set({
            lastUpdatedAt: new Date(),
            name,
            provider,
            configuration,
            credentials,
            model,
          })
          .where(eq(schema.llmChatEmbeddingProfile.id, profile.id))
          .returning()
          .then(res => res[0]!)

        return data
      })),

    delete: defineRoute({
      summary: 'Delete',
      method: 'DELETE',
      path: '/{id}',
      tags: ['LLM Chat: Embedding Profile'],
      successStatus: 204,
    }, os => os
      .input(z.object({ id: z.uuidv7() }))
      .output(z.null())
      .handler(async ({ context, input }) => {
        const { id } = input

        const profile = await context.db.query.llmChatEmbeddingProfile.findFirst({
          where: eq(schema.llmChatEmbeddingProfile.id, id),
          columns: { id: true },
        })
        if (!profile) {
          throw new ORPCError('NOT_FOUND', { message: 'Embedding Profile not found.' })
        }

        await context.db
          .delete(schema.llmChatEmbeddingProfile)
          .where(eq(schema.llmChatEmbeddingProfile.id, profile.id))

        return null
      })),
  })
