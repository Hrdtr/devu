import { Buffer } from 'node:buffer'
import { ORPCError } from '@orpc/server'
import { createSelectSchema } from 'drizzle-zod'
import { z } from 'zod/v4'
import { and, desc, eq, lt, or, schema, sql } from '@/database'
import { defineRoute, srv } from '@/utils'

const utilityInvocationHistorySchema = createSelectSchema(schema.utilityInvocationHistory)

export const utilityInvocationHistory = srv
  .prefix('/invocation-histories')
  .router({
    list: defineRoute({
      summary: 'List',
      method: 'GET',
      path: '/',
      tags: ['Utility: Invocation History'],
    }, os => os
      .input(z.object({
        utility: z.string().nullish(),
        search: z.string().nullish(),
        limit: z.coerce.number().min(1).max(99).or(z.coerce.number().min(-1).max(-1)).default(10),
        cursor: z.string().min(1).nullish(),
      }))
      .output(z.object({
        data: utilityInvocationHistorySchema.array(),
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
        const { utility, search, limit } = input

        const data = await context.db.query.utilityInvocationHistory.findMany({
          where: and(
            utility
              ? eq(schema.utilityInvocationHistory.utility, utility)
              : undefined,
            search
              ? or(
                  sql`LOWER(CAST(${schema.utilityInvocationHistory.input} AS TEXT)) ILIKE LOWER(${`%${search}%`})`,
                  sql`LOWER(CAST(${schema.utilityInvocationHistory.options} AS TEXT)) ILIKE LOWER(${`%${search}%`})`,
                )
              : undefined,
            context.parsedCursor
              ? or(
                  lt(schema.utilityInvocationHistory.createdAt, new Date(context.parsedCursor.createdAt)),
                  and(
                    eq(schema.utilityInvocationHistory.createdAt, new Date(context.parsedCursor.createdAt)),
                    lt(schema.utilityInvocationHistory.id, context.parsedCursor.id),
                  ),
                )
              : undefined,
          ),
          orderBy: [desc(schema.utilityInvocationHistory.createdAt), desc(schema.utilityInvocationHistory.id)],
          limit: limit === -1 ? undefined : limit,
        })

        let nextCursor: string | null = null
        if (data.length === limit) {
          const lastDataEntry = data[data.length - 1]!
          nextCursor = Buffer.from(JSON.stringify({
            createdAt: lastDataEntry.createdAt.toISOString(),
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
      tags: ['Utility: Invocation History'],
    }, os => os
      .input(z.object({ id: z.uuidv7() }))
      .output(utilityInvocationHistorySchema)
      .handler(async ({ context, input }) => {
        const { id } = input

        const data = await context.db.query.utilityInvocationHistory.findFirst({
          where: eq(schema.utilityInvocationHistory.id, id),
        })
        if (!data) {
          throw new ORPCError('NOT_FOUND', { message: 'Invocation history not found.' })
        }

        return data
      })),

    delete: defineRoute({
      summary: 'Delete',
      method: 'DELETE',
      path: '/{id}',
      tags: ['Utility: Invocation History'],
      successStatus: 204,
    }, os => os
      .input(z.object({ id: z.uuidv7() }))
      .output(z.null())
      .handler(async ({ context, input }) => {
        const { id } = input

        const chat = await context.db.query.utilityInvocationHistory.findFirst({
          where: eq(schema.utilityInvocationHistory.id, id),
          columns: { id: true },
        })
        if (!chat) {
          throw new ORPCError('NOT_FOUND', { message: 'Invocation history not found.' })
        }

        await context.db
          .delete(schema.utilityInvocationHistory)
          .where(eq(schema.utilityInvocationHistory.id, chat.id))

        return null
      })),
  })
