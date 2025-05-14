import type { Input /* , Options */, Output } from './definition'
import yaml from 'js-yaml'
import { schema } from './definition'

export * from './definition'

/**
 * Sorts lines in a string.
 */
export async function invoke(
  input: Input, /* , options?: Options */
): Promise<Output> {
  const yamlString = schema.input.parse(input)
  // const {} = schema.options.parse(options ?? {});

  const jsonObject = yaml.load(yamlString)
  const jsonString = JSON.stringify(jsonObject, null, 2)
  return schema.output.parse(jsonString)
}

export const yamlToJSON = invoke
