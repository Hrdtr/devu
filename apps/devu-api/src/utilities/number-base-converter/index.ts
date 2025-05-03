import type { Input, Options, Output } from './definition'
import { schema } from './definition'

export * from './definition'

export async function invoke(input: Input, options: Options): Promise<Output> {
  const number = schema.input.parse(input)
  const { fromBase, toBase } = schema.options.parse(options)

  const parsedNumber = Number.parseInt(number, fromBase)
  if (Number.isNaN(parsedNumber)) {
    throw new TypeError('Invalid number for the given base.')
  }
  return schema.output.parse(parsedNumber.toString(toBase))
}

export const convertNumberBase = invoke
