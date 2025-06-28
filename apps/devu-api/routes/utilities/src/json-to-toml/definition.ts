import { z } from 'zod/v4'
import { createDefinition } from '../_shared/create-definition'

export const { meta, schema } = createDefinition({
  meta: {
    id: 'json-to-toml',
    name: 'JSON to TOML',
    description: 'Converts a JSON string to a TOML string.',
    icon: undefined,
    requiresInternet: false,
    tags: ['json', 'toml', 'converter'],
    related: ['toml-to-json'],
  },
  schema: {
    input: z.string().meta({
      description: 'The JSON string to convert to TOML.',
      ui: {
        label: 'JSON String',
        component: 'CodeMirror',
        attrs: {
          lang: 'json',
          style: 'min-height: 10rem;',
        },
      },
    }),
    options: z.null(),
    output: z.string().meta({
      ui: {
        label: 'TOML String',
        component: 'CodeMirror',
        attrs: {
          lang: undefined,
          style: 'min-height: 10rem;',
        },
      },
    }),
  },
})

export type Input = z.input<typeof schema.input>
export type Options = z.input<typeof schema.options>
export type Output = z.input<typeof schema.output>
