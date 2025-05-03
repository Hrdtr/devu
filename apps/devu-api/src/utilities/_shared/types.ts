export interface Meta {
  id: string
  name: string
  description: string
  icon?: string
  schema: Record<string, any>
  dependencies: string[]
  requiresInternet: false
  tags: string[]
  related: string[]
}
