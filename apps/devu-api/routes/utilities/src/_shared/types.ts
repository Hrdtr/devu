import z from 'zod/v4'

export const MetaSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string().optional(),
  requiresInternet: z.boolean(),
  tags: z.string().array(),
  related: z.string().array(),
})

export type Meta = z.infer<typeof MetaSchema>

export interface Definition<Input extends z.ZodType, Options extends z.ZodType, Output extends z.ZodType> {
  meta: Meta
  schema: {
    input: Input
    options: Options
    output: Output
  }
}
