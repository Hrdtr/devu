import { z } from 'zod'
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
    options: z.undefined(),
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

export type Input = z.infer<typeof schema.input>
export type Options = z.infer<typeof schema.options>
export type Output = z.infer<typeof schema.output>
