import { eventIterator, ORPCError } from '@orpc/server'
import { z } from 'zod/v4'
import { defineRoute, splitString, srv } from '@/utils'
import * as src from './src'
import { execEventSchemaUnionMember, MetaSchema } from './src/_shared/types'

const activeExecutions = new Map<string, Set<string>>()

export const codePlayground = srv
  .prefix('/code-playgrounds')
  .router({
    all: defineRoute({
      summary: 'All',
      method: 'GET',
      path: '/',
      tags: ['Code Playground'],
    }, os => os
      .output(z.array(MetaSchema))
      .handler(() => {
        return Object.values(src).map(codePlayground => codePlayground.meta)
      })),

    retrieve: defineRoute({
      summary: 'Retrieve',
      method: 'GET',
      path: '/{id}',
      tags: [`Code Playground`],
    }, os => os
      .input(z.object({ id: z.string() }))
      .output(MetaSchema)
      .handler(({ input }) => {
        const codePlayground = Object.values(src).find(({ meta }) => meta.id === input.id)
        if (!codePlayground) {
          throw new ORPCError('NOT_FOUND', { message: 'Code Playground not found.' })
        }
        return codePlayground.meta
      })),

    schema: defineRoute({
      summary: 'Schema',
      method: 'GET',
      path: '/{id}/schema',
      tags: [`Code Playground`],
    }, os => os
      .input(z.object({ id: z.string() }))
      .output(z.object({
        input: z.any().meta({ type: 'object' }),
        options: z.any().meta({ type: 'object' }),
        output: z.any().meta({ type: 'object' }),
      }))
      .handler(({ input }) => {
        const codePlayground = Object.values(src).find(({ meta }) => meta.id === input.id)
        if (!codePlayground) {
          throw new ORPCError('NOT_FOUND', { message: 'Code Playground not found.' })
        }
        try {
          return {
            input: z.toJSONSchema(codePlayground.schema.input),
            options: z.toJSONSchema(codePlayground.schema.options),
            output: z.toJSONSchema(codePlayground.schema.output),
          }
        }
        catch (error) {
          console.error(error)
          throw new ORPCError('INTERNAL_SERVER_ERROR', { message: 'Failed to generate schema.' })
        }
      })),

    exec: defineRoute({
      summary: 'Execute Code',
      method: 'POST',
      path: '/{id}/exec',
      tags: [`Code Playground`],
    }, os => os
      .input(z.object({
        id: z.string(),
        input: z.any(),
        options: z.any().nullable(),
      }))
      .output(eventIterator(
        z.union([
          z.object({ type: z.literal('initialized'), data: z.object({ executionId: z.string() }) }),
          ...execEventSchemaUnionMember,
        ]),
      ))
      .handler(async function* ({ input, signal }) {
        const codePlayground = Object.values(src).find(({ meta }) => meta.id === input.id)
        if (!codePlayground) {
          throw new ORPCError('NOT_FOUND', { message: 'Code Playground not found.' })
        }

        const executionId = Bun.randomUUIDv7()

        // Track current execution
        let codePlaygroundActiveExecutions = activeExecutions.get(codePlayground.meta.id)
        if (!codePlaygroundActiveExecutions) {
          activeExecutions.set(codePlayground.meta.id, new Set<string>())
          codePlaygroundActiveExecutions = activeExecutions.get(codePlayground.meta.id)!
        }
        codePlaygroundActiveExecutions.add(executionId)

        // Create execution abort controller
        const executionAbortController = new AbortController()
        // Forward client abort signal to the execution abort controller
        const clientAbortSignalHandler = () => executionAbortController.abort()
        signal?.addEventListener('abort', clientAbortSignalHandler, { once: true })

        console.info(`[code-playground] Starting execution ${executionId}`)
        yield { type: 'initialized', data: { executionId } }

        try {
          const executionEventIterator = codePlayground.exec(input.input, {
            id: executionId,
            options: input.options || null,
            abortSignal: executionAbortController.signal,
          })
          for await (const event of executionEventIterator) {
            if (!codePlaygroundActiveExecutions.has(executionId) || executionAbortController.signal.aborted) {
              console.info(`[code-playground] Aborting execution ${executionId}`)
              if (!executionAbortController.signal.aborted) {
                executionAbortController.abort()
              }
              return
            }
            if (event.type === 'result') {
              if (event.error !== null) {
                const chunks = splitString(event.error, 256)
                let part = 1
                while (chunks.length > 0) {
                  yield {
                    type: chunks.length > 1 ? 'result:chunk' : 'result',
                    data: null,
                    error: chunks.length > 1 ? JSON.stringify({ part: part++, chunk: chunks.shift()! }) : chunks.shift()!,
                  }
                }
              }
              else {
                const chunks = splitString(event.data.value, 256)
                let part = 1
                while (chunks.length > 0) {
                  yield {
                    type: chunks.length > 1 ? 'result:chunk' : 'result',
                    data: {
                      ...event.data,
                      value: chunks.length > 1 ? JSON.stringify({ part: part++, chunk: chunks.shift()! }) : chunks.shift()!,
                    },
                    error: null,
                  }
                }
              }
            }
            else {
              yield event
            }
          }
        }
        catch (error) {
          console.error(`[code-playground] Execution ${executionId} failed`, error)
          const chunks = splitString(error instanceof Error ? error.message : String(error), 256)
          let part = 1
          while (chunks.length > 0) {
            yield {
              type: chunks.length > 1 ? 'result:chunk' : 'result',
              data: null,
              error: chunks.length > 1 ? JSON.stringify({ part: part++, chunk: chunks.shift()! }) : chunks.shift()!,
            }
          }
        }
        finally {
          if (codePlaygroundActiveExecutions.has(executionId)) {
            codePlaygroundActiveExecutions.delete(executionId)
            if (!codePlaygroundActiveExecutions.size) {
              activeExecutions.delete(codePlayground.meta.id)
            }
          }
          // Cleanup client abort signal event listener
          signal?.removeEventListener('abort', clientAbortSignalHandler)
        }
      })),

    abortExecution: defineRoute({
      summary: 'Abort Code Execution',
      method: 'POST',
      path: '/{id}/abort-execution',
      tags: [`Code Playground`],
    }, os => os
      .input(z.object({
        id: z.string(),
        executionId: z.uuidv7(),
      }))
      .output(z.null())
      .handler(async ({ input }) => {
        const codePlayground = Object.values(src).find(({ meta }) => meta.id === input.id)
        if (!codePlayground) {
          throw new ORPCError('NOT_FOUND', { message: 'Code Playground not found.' })
        }

        console.info(`[code-playground] Request to abort execution: ${input.executionId}`)

        const codePlaygroundActiveExecutions = activeExecutions.get(codePlayground.meta.id)
        if (!codePlaygroundActiveExecutions?.has(input.executionId)) {
          console.info(`[code-playground] Execution ${input.executionId} not found`)
          throw new ORPCError('NOT_FOUND', { message: 'No active execution found.' })
        }
        console.info(`[code-playground] Execution ${input.executionId} found. Requesting abort.`)
        codePlaygroundActiveExecutions.delete(input.executionId)
        return null
      })),
  })
