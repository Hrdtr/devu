import { ORPCError } from '@orpc/server'
import { z } from 'zod/v4'
import { createId, schema } from '@/database'
import { defineRoute, srv } from '@/utils'
import { utilityInvocationHistory } from './invocation-histories'
import * as src from './src'
import { MetaSchema } from './src/_shared/types'

export const utility = srv
  .prefix('/utilities')
  .router({
    all: defineRoute({
      summary: 'All',
      method: 'GET',
      path: '/',
      tags: ['Utility'],
    }, os => os
      .output(z.array(MetaSchema))
      .handler(() => {
        return Object.values(src).map(utility => utility.meta)
      })),

    retrieve: defineRoute({
      summary: 'Retrieve',
      method: 'GET',
      path: '/{id}',
      tags: ['Utility'],
    }, os => os
      .input(z.object({ id: z.string() }))
      .output(MetaSchema)
      .handler(({ input }) => {
        const utility = Object.values(src).find(({ meta }) => meta.id === input.id)
        if (!utility) {
          throw new ORPCError('NOT_FOUND', { message: 'Utility not found.' })
        }
        return utility.meta
      })),

    schema: defineRoute({
      summary: 'Schema',
      method: 'GET',
      path: '/{id}/schema',
      tags: ['Utility'],
    }, os => os
      .input(z.object({ id: z.string() }))
      .output(z.object({
        input: z.any().meta({ type: 'object' }),
        options: z.any().meta({ type: 'object' }),
        output: z.any().meta({ type: 'object' }),
      }))
      .handler(({ input }) => {
        const utility = Object.values(src).find(({ meta }) => meta.id === input.id)
        if (!utility) {
          throw new ORPCError('NOT_FOUND', { message: 'Utility not found.' })
        }
        return {
          input: z.toJSONSchema(utility.schema.input),
          options: z.toJSONSchema(utility.schema.options),
          output: z.toJSONSchema(utility.schema.output),
        }
      })),

    invoke: defineRoute({
      summary: 'Invoke',
      method: 'POST',
      path: '/{id}/invoke',
      tags: ['Utility'],
    }, os => os
      .input(z.object({
        id: z.string(),
        input: z.any(),
        options: z.any().nullable(),
      }))
      .output(z.any())
      .handler(async ({ context, input }) => {
        const utility = Object.values(src).find(({ meta }) => meta.id === input.id)
        if (!utility) {
          throw new ORPCError('NOT_FOUND', { message: 'Utility not found.' })
        }
        try {
          const output = await utility.invoke(input.input, input.options || null)
          await context.db.insert(schema.utilityInvocationHistory).values({
            id: createId(),
            utility: utility.meta.id,
            input: input.input,
            options: input.options,
            output,
          }).catch(() => {})

          return output
        }
        catch (error) {
          throw new ORPCError('BAD_REQUEST', { message: error instanceof Error ? error.message : 'Unknown error' })
        }
      })),

    invocationHistories: utilityInvocationHistory,
  })
