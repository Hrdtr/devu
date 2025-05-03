import { z } from 'zod'
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
    options: z.interface({
      'indent?': z
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
  dependencies: [],
  requiresInternet: false,
  tags: ['json', 'formatting'],
  related: [],
})

export type Input = z.infer<typeof schema.input>
export type Options = z.infer<typeof schema.options>
export type Output = z.infer<typeof schema.output>
