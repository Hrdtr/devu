import z from 'zod'

export const MetaSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string().optional(),
  schema: z.object({
    input: z.record(z.string(), z.any()),
    options: z.record(z.string(), z.any()),
    output: z.record(z.string(), z.any()),
  }),
  dependencies: z.string().array(),
  requiresInternet: z.boolean(),
  tags: z.string().array(),
  related: z.string().array(),
})

export type Meta = z.infer<typeof MetaSchema>
