import type { Input, Options, Output } from './definition'
import { schema } from './definition'

export * from './definition'

/**
 * Formats a JSON string with specified indentation.
 */
export async function invoke(input: Input, options?: Options): Promise<Output> {
  const jsonString = schema.input.parse(input)
  const { indent } = schema.options.parse(options ?? {})

  const parsedJson = JSON.parse(jsonString)
  const formattedJson = JSON.stringify(parsedJson, null, indent)
  return schema.output.parse(formattedJson)
}

export const formatJSON = invoke
