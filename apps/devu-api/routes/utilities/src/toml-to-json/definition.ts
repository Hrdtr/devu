import { z } from 'zod/v4'
import { createDefinition } from '../_shared/create-definition'

export const { meta, schema } = createDefinition({
  id: 'toml-to-json',
  name: 'TOML to JSON',
  description: 'Converts a TOML string to a JSON string.',
  icon: undefined,
  schema: {
    input: z.string().meta({
      description: 'The TOML string to convert to JSON.',
      ui: {
        label: 'TOML String',
        component: 'CodeMirror',
        attrs: {
          lang: undefined,
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
  dependencies: ['@iarna/toml'],
  requiresInternet: false,
  tags: ['toml', 'json', 'converter'],
  related: ['json-to-toml'],
})

export type Input = z.input<typeof schema.input>
export type Options = z.input<typeof schema.options>
export type Output = z.input<typeof schema.output>
