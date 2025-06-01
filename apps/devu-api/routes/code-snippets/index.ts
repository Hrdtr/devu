import { Buffer } from 'node:buffer'
import { ORPCError } from '@orpc/server'
import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod/v4'
import { and, createId, desc, eq, lt, or, schema, sql } from '@/database'
import { defineRoute, srv } from '@/utils'

const codeSnippetSchema = createSelectSchema(schema.codeSnippet)

export const codeSnippet = srv
  .prefix('/code-snippets')
  .router({
    create: defineRoute({
      summary: 'Create',
      method: 'POST',
      path: '/',
      tags: ['Code Snippet'],
    }, os => os
      .input(z.object({
        name: z.string().min(1),
        language: z.string().min(1),
        code: z.string().min(1),
        notes: z.string().min(1).nullish(),
      }))
      .output(codeSnippetSchema)
      .handler(async ({ context, input }) => {
        const { name, language, code, notes } = input
        const data = await context.db
          .insert(schema.codeSnippet)
          .values({ id: createId(), name, language, code, notes })
          .returning()
          .then(res => res[0]!)

        return data
      })),

    list: defineRoute({
      summary: 'List',
      method: 'GET',
      path: '/',
      tags: ['Code Snippet'],
    }, os => os
      .input(z.object({
        language: z.string().nullish(),
        search: z.string().nullish(),
        limit: z.coerce.number().min(1).max(99).or(z.coerce.number().min(-1).max(-1)).default(10),
        cursor: z.string().min(1).nullish(),
      }))
      .output(z.object({
        data: codeSnippetSchema.array(),
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
        const { language, search, limit } = input

        const data = await context.db.query.codeSnippet.findMany({
          where: and(
            language
              ? eq(schema.codeSnippet.language, language)
              : undefined,
            search
              ? or(
                  sql`${schema.codeSnippet.name} LIKE ${`%${search}%`} COLLATE NOCASE`,
                  sql`${schema.codeSnippet.code} LIKE ${`%${search}%`} COLLATE NOCASE`,
                )
              : undefined,
            context.parsedCursor
              ? or(
                  lt(schema.codeSnippet.lastUpdatedAt, new Date(context.parsedCursor.lastUpdatedAt)),
                  and(
                    eq(schema.codeSnippet.lastUpdatedAt, new Date(context.parsedCursor.lastUpdatedAt)),
                    lt(schema.codeSnippet.id, context.parsedCursor.id),
                  ),
                )
              : undefined,
          ),
          orderBy: [desc(schema.codeSnippet.lastUpdatedAt), desc(schema.codeSnippet.id)],
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
      tags: ['Code Snippet'],
    }, os => os
      .input(z.object({ id: z.uuidv7() }))
      .output(codeSnippetSchema)
      .handler(async ({ context, input }) => {
        const { id } = input

        const data = await context.db.query.codeSnippet.findFirst({
          where: eq(schema.codeSnippet.id, id),
        })
        if (!data) {
          throw new ORPCError('NOT_FOUND', { message: 'Snippet not found.' })
        }

        return data
      })),

    update: defineRoute({
      summary: 'Update',
      method: 'PATCH',
      path: '/{id}',
      tags: ['Code Snippet'],
    }, os => os
      .input(z.object({
        id: z.uuidv7(),
        ...z.object({
          name: z.string().min(1),
          language: z.string().min(1),
          code: z.string().min(1),
          notes: z.string().min(1).nullish(),
        }).partial().shape,
      }))
      .output(codeSnippetSchema)
      .handler(async ({ context, input }) => {
        const { id, name, language, code, notes } = input

        const chat = await context.db.query.codeSnippet.findFirst({
          where: eq(schema.codeSnippet.id, id),
          columns: { id: true },
        })
        if (!chat) {
          throw new ORPCError('NOT_FOUND', { message: 'Snippet not found.' })
        }

        const data = await context.db
          .update(schema.codeSnippet)
          .set({ lastUpdatedAt: new Date(), name, language, code, notes })
          .where(eq(schema.codeSnippet.id, chat.id))
          .returning()
          .then(res => res[0]!)

        return data
      })),

    delete: defineRoute({
      summary: 'Delete',
      method: 'DELETE',
      path: '/{id}',
      tags: ['Code Snippet'],
      successStatus: 204,
    }, os => os
      .input(z.object({ id: z.uuidv7() }))
      .output(z.null())
      .handler(async ({ context, input }) => {
        const { id } = input

        const chat = await context.db.query.codeSnippet.findFirst({
          where: eq(schema.codeSnippet.id, id),
          columns: { id: true },
        })
        if (!chat) {
          throw new ORPCError('NOT_FOUND', { message: 'Snippet not found.' })
        }

        await context.db
          .delete(schema.codeSnippet)
          .where(eq(schema.codeSnippet.id, chat.id))

        return null
      })),
  })
