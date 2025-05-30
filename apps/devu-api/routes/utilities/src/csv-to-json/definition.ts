import { z } from 'zod/v4'
import { createDefinition } from '../_shared/create-definition'

export const { meta, schema } = createDefinition({
  id: 'csv-to-json',
  name: 'CSV to JSON',
  description: 'Converts a CSV string to a JSON string.',
  icon: undefined,
  schema: {
    input: z.string().meta({
      description: 'The CSV string to convert to JSON.',
      ui: {
        label: 'CSV String',
        component: 'CodeMirror',
        attrs: {
          lang: undefined,
          style: 'min-height: 10rem;',
        },
      },
    }),
    options: z.object({
      separator: z
        .string()
        .default(',')
        .meta({
          description: 'The separator character ("," by default).',
          ui: {
            label: 'Separator',
            component: 'Input',
            attrs: {
              type: 'text',
            },
          },
        }),
      headers: z
        .string()
        .optional()
        .meta({
          description: 'Explicitly specify csv headers as a comma separated list',
          ui: {
            label: 'Headers',
            component: 'Input',
            attrs: {
              type: 'text',
            },
          },
        }),
      skipComments: z
        .string()
        .optional()
        .meta({
          description:
          'Skip CSV comments that begin with \'#\'. Set a value to change the comment character.',
          ui: {
            label: 'Skip Comments',
            component: 'Input',
            attrs: {
              type: 'text',
            },
          },
        }),
      skipLines: z
        .number()
        .optional()
        .meta({
          description:
          'Set the number of lines to skip to before parsing headers',
          ui: {
            label: 'Skip Lines',
            component: 'Input',
            attrs: {
              type: 'number',
              min: 0,
            },
          },
        }),
      strict: z
        .boolean()
        .optional()
        .meta({
          description: 'Require column length match headers length',
          ui: {
            label: 'Strict',
            component: 'Checkbox',
            attrs: {},
          },
        }),
    }),
    output: z.string().meta({
      ui: {
        label: 'JSON String',
        component: 'CodeMirror',
        attrs: {
          lang: 'json',
          style: 'min-height: 10rem;',
        },
      },
    }),
  },
  dependencies: ['csv-parser'],
  requiresInternet: false,
  tags: ['csv', 'json', 'converter'],
  related: ['json-to-csv'],
})

export type Input = z.input<typeof schema.input>
export type Options = z.input<typeof schema.options>
export type Output = z.input<typeof schema.output>
