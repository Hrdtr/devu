import type { ZodType } from 'zod/v4'
import type { Meta } from './types'
import { z } from 'zod/v4'

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
        options: z.toJSONSchema(schema.options),
        output: z.toJSONSchema(schema.output),
      },
    },
    schema,
  }
}
