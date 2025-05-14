import { z } from 'zod'
import { createDefinition } from '../_shared/create-definition'

export const { meta, schema } = createDefinition({
  id: 'yaml-to-json',
  name: 'YAML to JSON',
  description: 'Converts a YAML string to a JSON string.',
  icon: undefined,
  schema: {
    input: z.string().meta({
      description: 'The YAML string to convert to JSON.',
      ui: {
        label: 'YAML String',
        component: 'CodeMirror',
        attrs: {
          lang: 'yaml',
          style: 'min-height: 10rem;',
        },
      },
    }),
    options: z.null(),
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
  dependencies: ['js-yaml'],
  requiresInternet: false,
  tags: ['yaml', 'json', 'converter'],
  related: ['json-to-yaml'],
})

export type Input = z.input<typeof schema.input>
export type Options = z.input<typeof schema.options>
export type Output = z.input<typeof schema.output>
