import type { ZodType } from 'zod'
import type { Meta } from './types'
import { z } from 'zod'

export function createDefinition<
  Input extends ZodType,
  Options extends ZodType,
  Output extends ZodType,
>(
  meta: Omit<Meta, 'schema'> & {
    schema: {
      input: Input
      options: Options
      output: Output
    }
  },
) {
  const schema = {
    input: meta.schema.input,
    options: meta.schema.options,
    output: meta.schema.output,
  }

  return {
    meta: {
      ...meta,
      schema: {
        input: z.toJSONSchema(schema.input),
        options:
          schema.options instanceof z.ZodUndefined
          || schema.options instanceof z.ZodNull
            ? undefined
            : z.toJSONSchema(schema.options),
        output: z.toJSONSchema(schema.output),
      },
    },
    schema,
  }
}
