import { z } from 'zod/v4'

export const MetaSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string().optional(),
  kind: z.enum(['language', 'framework']),
  referenceUrl: z.string().optional(),
  tags: z.string().array(),
  related: z.string().array(),
})

export type Meta = z.infer<typeof MetaSchema>

export type InputSchemaType = z.ZodObject<{
  [key: string]: z.ZodString
}>

export type OutputSchemaType = z.ZodObject<{
  stdio: z.ZodLiteral<true | false>
  result: z.ZodObject<{
    [key: string]: z.ZodString
  }>
}>

export interface Definition<Input extends InputSchemaType, Options extends z.ZodObject = z.ZodObject, Output extends OutputSchemaType = OutputSchemaType> {
  meta: Meta
  schema: {
    input: Input
    options: Options
    output: Output
  }
}

export interface ConsoleEntry {
  type: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  data: string
}

export interface ExecConfigBase {
  id: string
  stdout?: (message: string) => void
  stderr?: (message: string) => void
  abortSignal?: AbortSignal
}

export const execEventSchemaUnionMember = [
  z.object({ type: z.literal('stdout'), data: z.string() }),
  z.object({ type: z.literal('stderr'), data: z.string() }),
  z.object({ type: z.literal('result:chunk'), data: z.object({ key: z.string(), value: z.string() }), error: z.null() }),
  z.object({ type: z.literal('result'), data: z.object({ key: z.string(), value: z.string() }), error: z.null() }),
  z.object({ type: z.literal('result:chunk'), data: z.null(), error: z.string() }),
  z.object({ type: z.literal('result'), data: z.null(), error: z.string() }),
]
export const execEventSchema = z.union(execEventSchemaUnionMember)

export type ExecEvent = z.infer<typeof execEventSchema>
