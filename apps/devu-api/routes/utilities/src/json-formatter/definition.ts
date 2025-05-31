import { z } from 'zod/v4'
import { createDefinition } from '../_shared/create-definition'

export const { meta, schema } = createDefinition({
  id: 'json-formatter',
  name: 'JSON Formatter',
  description: 'Formats a JSON string.',
  icon: undefined,
  schema: {
    input: z.string().meta({
      description: 'The JSON string to format.',
      ui: {
        label: 'JSON String',
        component: 'CodeMirror',
        attrs: {
          lang: 'json',
          style: 'min-height: 10rem;',
        },
      },
    }),
    options: z.object({
      indent: z
        .number()
        .default(2)
        .meta({
          description: 'The number of spaces for indentation.',
          ui: {
            label: 'Indent',
            component: 'Input',
            attrs: {
              type: 'number',
              min: 2,
              max: 8,
            },
          },
        }),
    }),
    output: z.string().meta({
      ui: {
        label: 'Formatted JSON',
        component: 'CodeMirror',
        attrs: {
          lang: 'json',
          style: 'min-height: 10rem;',
        },
      },
    }),
  },
  requiresInternet: false,
  tags: ['json', 'formatting'],
  related: [],
})

export type Input = z.input<typeof schema.input>
export type Options = z.input<typeof schema.options>
export type Output = z.input<typeof schema.output>
