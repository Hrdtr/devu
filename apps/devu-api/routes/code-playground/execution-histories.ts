import { Buffer } from 'node:buffer'
import { ORPCError } from '@orpc/server'
import { z } from 'zod/v4'
import { and, createId, desc, eq, ilike, lt, or, schema } from '@/database'
import { defineRoute, srv } from '@/utils'

const codePlaygroundExecutionHistorySchema = z.object({
  id: z.uuidv7(),
  createdAt: z.date(),
  playground: z.string(),
  code: z.string(),
  output: z.any(),
})

export const codePlaygroundExecutionHistory = srv
  .prefix('/execution-histories')
  .router({
    create: defineRoute({
      summary: 'Create',
      method: 'POST',
      path: '/',
      tags: ['Code Playground: Execution History'],
    }, os => os
      .input(z.object({
        playground: z.string().min(1),
        code: z.string().min(1),
        output: z.any(),
      }))
      .output(codePlaygroundExecutionHistorySchema)
      .handler(async ({ context, input }) => {
        const { playground, code, output } = input
        const data = await context.db
          .insert(schema.codePlaygroundExecutionHistory)
          .values({ id: createId(), playground, code, output })
          .returning()
          .then(res => res[0]!)

        return data
      })),

    list: defineRoute({
      summary: 'List',
      method: 'GET',
      path: '/',
      tags: ['Code Playground: Execution History'],
    }, os => os
      .input(z.object({
        playground: z.string().nullish(),
        search: z.string().nullish(),
        limit: z.coerce.number().min(1).max(99).or(z.coerce.number().min(-1).max(-1)).default(10),
        cursor: z.string().min(1).nullish(),
      }))
      .output(z.object({
        data: codePlaygroundExecutionHistorySchema.array(),
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
        const { playground, search, limit } = input

        const data = await context.db.query.codePlaygroundExecutionHistory.findMany({
          where: and(
            playground
              ? eq(schema.codePlaygroundExecutionHistory.playground, playground)
              : undefined,
            search
              ? or(
                  ilike(schema.codePlaygroundExecutionHistory.code, `%${search}%`),
                )
              : undefined,
            context.parsedCursor
              ? or(
                  lt(schema.codePlaygroundExecutionHistory.createdAt, new Date(context.parsedCursor.createdAt)),
                  and(
                    eq(schema.codePlaygroundExecutionHistory.createdAt, new Date(context.parsedCursor.createdAt)),
                    lt(schema.codePlaygroundExecutionHistory.id, context.parsedCursor.id),
                  ),
                )
              : undefined,
          ),
          orderBy: [desc(schema.codePlaygroundExecutionHistory.createdAt), desc(schema.codePlaygroundExecutionHistory.id)],
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
      tags: ['Code Playground: Execution History'],
    }, os => os
      .input(z.object({ id: z.uuidv7() }))
      .output(codePlaygroundExecutionHistorySchema)
      .handler(async ({ context, input }) => {
        const { id } = input

        const data = await context.db.query.codePlaygroundExecutionHistory.findFirst({
          where: eq(schema.codePlaygroundExecutionHistory.id, id),
        })
        if (!data) {
          throw new ORPCError('NOT_FOUND', { message: 'Execution history not found.' })
        }

        return data
      })),

    delete: defineRoute({
      summary: 'Delete',
      method: 'DELETE',
      path: '/{id}',
      tags: ['Code Playground: Execution History'],
      successStatus: 204,
    }, os => os
      .input(z.object({ id: z.uuidv7() }))
      .output(z.null())
      .handler(async ({ context, input }) => {
        const { id } = input

        const chat = await context.db.query.codePlaygroundExecutionHistory.findFirst({
          where: eq(schema.codePlaygroundExecutionHistory.id, id),
          columns: { id: true },
        })
        if (!chat) {
          throw new ORPCError('NOT_FOUND', { message: 'Execution history not found.' })
        }

        await context.db
          .delete(schema.codePlaygroundExecutionHistory)
          .where(eq(schema.codePlaygroundExecutionHistory.id, chat.id))

        return null
      })),
  })
