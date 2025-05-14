import type { Input /* , Options */, Output } from './definition'
import toml from '@iarna/toml'
import { schema } from './definition'

export * from './definition'

export async function invoke(
  input: Input, /* , options?: Options */
): Promise<Output> {
  const tomlString = schema.input.parse(input)
  // const {} = schema.options.parse(options)

  const jsonObject = toml.parse(tomlString)
  const jsonString = JSON.stringify(jsonObject, null, 2)
  return schema.output.parse(jsonString)
}

export const tomlToJSON = invoke
