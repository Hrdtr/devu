import { z } from 'zod'
import { createId, schema } from '@/database'
import { defineRoute, srv } from '@/utils'
import { utilityInvocationHistory } from './invocation-histories'
import * as src from './src'
import { MetaSchema } from './src/_shared/types'

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
        .output(MetaSchema)
        .handler(() => utility.meta)),

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
    }, os => os.handler(() => Object.values(src).map(utility => utility.meta))),
    invocationHistories: utilityInvocationHistory,
    ...buildUtilityRoutes(src),
  })
