import { z } from 'zod/v4'
import { createDefinition } from '../_shared/create-definition'

export const { meta, schema } = createDefinition({
  id: 'string-lines-sorter',
  name: 'String Lines Sorter',
  description: 'Sorts lines in a string.',
  icon: undefined,
  schema: {
    input: z.string().meta({
      description: 'The string to sort lines from.',
      ui: {
        label: 'String',
        component: 'CodeMirror',
        attrs: {
          lang: undefined,
          style: 'min-height: 10rem;',
        },
      },
    }),
    options: z.object({
      deduplicate: z
        .boolean()
        .default(false)
        .meta({
          description: 'Whether to remove duplicate lines.',
          ui: {
            label: 'Deduplicate',
            component: 'Checkbox',
            attrs: {},
          },
        }),
      order: z
        .enum(['asc', 'desc'])
        .default('asc')
        .meta({
          description: 'The order to sort the lines in (asc or desc).',
          ui: {
            label: 'Order',
            component: 'Select',
            attrs: {},
          },
        }),
      caseInsensitive: z
        .boolean()
        .default(false)
        .meta({
          description: 'Whether to sort lines case-insensitively.',
          ui: {
            label: 'Case Insensitive',
            component: 'Checkbox',
            attrs: {},
          },
        }),
    }),
    output: z.string().meta({
      ui: {
        label: 'Sorted String',
        component: 'CodeMirror',
        attrs: {
          lang: undefined,
          style: 'min-height: 10rem;',
        },
      },
    }),
  },
  dependencies: [],
  requiresInternet: false,
  tags: ['string', 'sort', 'lines'],
  related: [],
})

export type Input = z.input<typeof schema.input>
export type Options = z.input<typeof schema.options>
export type Output = z.input<typeof schema.output>
