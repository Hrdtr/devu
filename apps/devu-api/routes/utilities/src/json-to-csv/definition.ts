import { z } from 'zod/v4'
import { createDefinition } from '../_shared/create-definition'

export const { meta, schema } = createDefinition({
  id: 'json-to-csv',
  name: 'JSON to CSV',
  description: 'Converts a JSON string to a CSV string.',
  icon: undefined,
  schema: {
    input: z.string().meta({
      description: 'The JSON string to convert to CSV.',
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
      fields: z
        .array(z.string())
        .default([])
        .meta({
          description: 'Explicit list of fields to include.',
          ui: {
            label: 'Fields',
            component: 'TagsInput',
            attrs: {},
          },
        }),
      delimiter: z
        .string()
        .default(',')
        .meta({
          description: 'Character(s) to use as a column delimiter.',
          ui: {
            label: 'Delimiter',
            component: 'Input',
            attrs: {
              type: 'text',
            },
          },
        }),
      eol: z
        .string()
        .optional()
        .meta({
          description: 'Character(s) to use as a line delimiter.',
          ui: {
            label: 'EOL',
            component: 'Input',
            attrs: {
              type: 'text',
            },
          },
        }),
      header: z
        .boolean()
        .default(true)
        .meta({
          description:
            'Determines whether or not CSV file will contain a title column.',
          ui: {
            label: 'Header',
            component: 'Checkbox',
            attrs: {},
          },
        }),
      includeEmptyRows: z
        .boolean()
        .default(false)
        .meta({
          description: 'Includes empty rows.',
          ui: {
            label: 'Include Empty Rows',
            component: 'Checkbox',
            attrs: {},
          },
        }),
      withBOM: z
        .boolean()
        .default(false)
        .meta({
          description: 'With BOM character.',
          ui: {
            label: 'With BOM',
            component: 'Checkbox',
            attrs: {},
          },
        }),
      defaultValue: z
        .string()
        .optional()
        .meta({
          ui: {
            label: 'Default Value',
            component: 'Input',
            attrs: {
              type: 'text',
            },
          },
        }),
    }),
    output: z.string().meta({
      ui: {
        label: 'CSV String',
        component: 'CodeMirror',
        attrs: {
          lang: undefined,
          style: 'min-height: 10rem;',
        },
      },
    }),
  },
  dependencies: ['@json2csv/plainjs'],
  requiresInternet: false,
  tags: ['json', 'csv', 'converter'],
  related: ['csv-to-json'],
})

export type Input = z.input<typeof schema.input>
export type Options = z.input<typeof schema.options>
export type Output = z.input<typeof schema.output>
