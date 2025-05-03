import type { Input, Options, Output } from './definition'
import { dump } from 'js-yaml'
import { schema } from './definition'

export * from './definition'

export async function invoke(input: Input, options?: Options): Promise<Output> {
  const jsonString = schema.input.parse(input)
  const { indent, lineWidth, noRefs, sortKeys } = schema.options.parse(
    options ?? {},
  )

  const jsonObject = JSON.parse(jsonString)
  const yamlString = dump(jsonObject, {
    indent,
    lineWidth,
    noRefs,
    sortKeys,
  })
  return schema.output.parse(yamlString)
}

export const jsonToYAML = invoke
