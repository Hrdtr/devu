import { z } from 'zod/v4'
import { createDefinition } from '../_shared/create-definition'

export const { meta, schema } = createDefinition({
  meta: {
    id: 'js-minifier',
    name: 'JS Minifier',
    description: 'Formats a JavaScript string.',
    icon: undefined,
    requiresInternet: false,
    tags: ['javascript', 'minification'],
    related: ['js-beautifier'],
  },
  schema: {
    input: z.string().meta({
      description: 'The JavaScript string to minify.',
      ui: {
        label: 'JavaScript String',
        component: 'CodeMirror',
        attrs: {
          lang: 'javascript',
          style: 'min-height: 10rem;',
        },
      },
    }),
    options: z.object({
      mangle: z
        .boolean()
        .default(true)
        .meta({
          description: 'Whether to mangle variable names.',
          ui: {
            label: 'Mangle',
            component: 'Checkbox',
            attrs: {},
          },
        }),
      compress: z
        .boolean()
        .default(true)
        .meta({
          description: 'Whether to compress the code.',
          ui: {
            label: 'Compress',
            component: 'Checkbox',
            attrs: {},
          },
        }),
    }),
    output: z.string().meta({
      ui: {
        label: 'Minified JavaScript',
        component: 'CodeMirror',
        attrs: {
          lang: 'javascript',
          style: 'min-height: 10rem;',
        },
      },
    }),
  },
})

export type Input = z.input<typeof schema.input>
export type Options = z.input<typeof schema.options>
export type Output = z.input<typeof schema.output>
