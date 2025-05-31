import z from 'zod/v4'

export const MetaSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string().optional(),
  schema: z.object({
    input: z.any(),
    options: z.any(),
    output: z.any(),
  }),
  dependencies: z.string().array(),
  requiresInternet: z.boolean(),
  tags: z.string().array(),
  related: z.string().array(),
})

export type Meta = z.infer<typeof MetaSchema>
