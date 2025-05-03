import type { Input, Options, Output } from './definition'
import {
  camelCase,
  flatCase,
  kebabCase,
  lowerFirst,
  pascalCase,
  snakeCase,
  titleCase,
  trainCase,
  upperFirst,
} from 'scule'
import { schema } from './definition'

export * from './definition'

/**
 * Converts a string to different cases.
 */
export async function invoke(input: Input, options: Options): Promise<Output> {
  const string = schema.input.parse(input)
  const { targetCase } = schema.options.parse(options)

  let result: string
  switch (targetCase) {
    case 'camel':
      result = camelCase(string)
      break
    case 'pascal':
      result = pascalCase(string)
      break
    case 'snake':
      result = snakeCase(string)
      break
    case 'kebab':
      result = kebabCase(string)
      break
    case 'flat':
      result = flatCase(string)
      break
    case 'train':
      result = trainCase(string)
      break
    case 'title':
      result = titleCase(string)
      break
    case 'upperFirst':
      result = upperFirst(string)
      break
    case 'lowerFirst':
      result = lowerFirst(string)
      break
    default:
      result = string
  }

  return schema.output.parse(result)
}

export const convertStringCase = invoke
