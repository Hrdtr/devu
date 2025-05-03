import type { Input /* , Options */, Output } from './definition'
import { stringify } from '@iarna/toml'
import { schema } from './definition'

export * from './definition'

export async function invoke(
  input: Input, /* , options?: Options */
): Promise<Output> {
  const jsonString = schema.input.parse(input)
  // const {} = schema.options.parse(options)

  const jsonObject = JSON.parse(jsonString)
  const tomlString = stringify(jsonObject)
  return schema.output.parse(tomlString)
}

export const jsonToTOML = invoke
