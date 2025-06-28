import type { ZodObject } from 'zod/v4'
import type { Definition, InputSchemaType, OutputSchemaType } from './types'

export function createDefinition<
  Input extends InputSchemaType,
  Options extends ZodObject,
  Output extends OutputSchemaType,
>(definition: Definition<Input, Options, Output>): Definition<Input, Options, Output> {
  return definition
}
