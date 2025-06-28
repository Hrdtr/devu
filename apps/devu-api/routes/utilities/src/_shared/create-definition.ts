import type { ZodType } from 'zod/v4'
import type { Definition } from './types'

export function createDefinition<
  Input extends ZodType,
  Options extends ZodType,
  Output extends ZodType,
>(definition: Definition<Input, Options, Output>): Definition<Input, Options, Output> {
  return definition
}
