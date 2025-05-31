import { z } from 'zod/v4'
import { createId, schema } from '@/database'
import { defineRoute, srv } from '@/utils'
import { utilityInvocationHistory } from './invocation-histories'
import * as src from './src'

// 1) Given a single utility, build its router:
function makeUtilityRoute<U extends typeof src[keyof typeof src]>(utility: U) {
  return srv
    .prefix(`/${utility.meta.id}`)
    .router({
      meta: defineRoute({
        summary: 'Meta',
        description: utility.meta.description,
        method: 'GET',
        path: '/',
        tags: [`Utility: ${utility.meta.name}`],
      }, os => os
        .output(z.object({
          id: z.string().default(utility.meta.id),
          name: z.string().default(utility.meta.name),
          description: z.string().default(utility.meta.description),
          icon: z.string().default(utility.meta.icon ?? '').optional(),
          requiresInternet: z.boolean().default(utility.meta.requiresInternet),
          tags: z.array(z.string()).default(utility.meta.tags),
          related: z.array(z.string()).default(utility.meta.related),
          schema: z.object({
            input: z.any().default(z.toJSONSchema(utility.schema.input)).meta({ type: 'object' }),
            options: z.any().default(z.toJSONSchema(utility.schema.options)).meta({ type: 'object' }),
            output: z.any().default(z.toJSONSchema(utility.schema.output)).meta({ type: 'object' }),
          }),
        }))
        .handler(() => ({
          ...utility.meta,
          schema: {
            input: z.toJSONSchema(utility.schema.input),
            options: z.toJSONSchema(utility.schema.options),
            output: z.toJSONSchema(utility.schema.output),
          },
        }))),

      invoke: defineRoute({
        summary: 'Invoke',
        method: 'POST',
        path: '/invoke',
        tags: [`Utility: ${utility.meta.name}`],
      }, os => os
        .input(z.object({
          input: utility.schema.input,
          options: utility.schema.options,
        }))
        .output(utility.schema.output)
        .handler(async ({ context, input: routerInput }) => {
          const output = await utility.invoke(routerInput.input, routerInput.options)
          await context.db.insert(schema.utilityInvocationHistory).values({
            id: createId(),
            utility: utility.meta.id,
            input: routerInput.input,
            options: routerInput.options,
            output,
          }).catch(() => {})
          return output
        })),
    })
}

function buildUtilityRoutes<T extends Record<string, typeof src[keyof typeof src]>>(src: T) {
  const result = {} as { [K in keyof T]: ReturnType<typeof makeUtilityRoute<T[K]>> }
  for (const key of Object.keys(src) as Array<keyof T>) {
    result[key] = makeUtilityRoute(src[key])
  }

  return result
}

export const utility = srv
  .prefix('/utilities')
  .router({
    all: defineRoute({
      summary: 'All Utility Meta',
      method: 'GET',
      path: '/',
      tags: ['Utility'],
    }, os => os
      .output(z.object({
        id: z.string().meta({ examples: Object.values(src).map(utility => utility.meta.id) }),
        name: z.string().meta({ examples: Object.values(src).map(utility => utility.meta.name) }),
        description: z.string().meta({ examples: Object.values(src).map(utility => utility.meta.description) }),
        icon: z.string().optional().meta({ examples: Object.values(src).map(utility => utility.meta.icon ?? '') }),
        requiresInternet: z.boolean().meta({ examples: Object.values(src).map(utility => utility.meta.requiresInternet) }),
        tags: z.array(z.string()).meta({ examples: Object.values(src).map(utility => utility.meta.tags) }),
        related: z.array(z.string()).meta({ examples: Object.values(src).map(utility => utility.meta.related) }),
        schema: z.object({
          input: z.any().meta({ examples: Object.values(src).map(utility => z.toJSONSchema(utility.schema.input)) }).meta({ type: 'object' }),
          options: z.any().meta({ examples: Object.values(src).map(utility => z.toJSONSchema(utility.schema.options)) }).meta({ type: 'object' }),
          output: z.any().meta({ examples: Object.values(src).map(utility => z.toJSONSchema(utility.schema.output)) }).meta({ type: 'object' }),
        }),
      }).array())
      .handler(() => {
        return Object.values(src).map(utility => ({
          ...utility.meta,
          schema: {
            input: z.toJSONSchema(utility.schema.input),
            options: z.toJSONSchema(utility.schema.options),
            output: z.toJSONSchema(utility.schema.output),
          },
        }))
      })),

    invocationHistories: utilityInvocationHistory,

    ...buildUtilityRoutes(src),
  })
