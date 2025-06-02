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

export interface Meta {
  id: string
  name: string
  description: string
  requiresInternet: boolean
  tags: string[]
  related: string[]
  icon?: string | undefined
}
