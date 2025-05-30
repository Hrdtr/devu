import { z } from 'zod/v4'
import { createDefinition } from '../_shared/create-definition'

export const { meta, schema } = createDefinition({
  id: 'css-beautifier',
  name: 'CSS Beautifier',
  description: 'Formats a CSS string.',
  icon: undefined,
  schema: {
    input: z.string().meta({
      description: 'The CSS string to beautify.',
      ui: {
        label: 'CSS String',
        component: 'CodeMirror',
        attrs: {
          lang: 'css',
          style: 'min-height: 10rem;',
        },
      },
    }),
    options: z.object({
      indentSize: z
        .number()
        .default(2)
        .meta({
          description: 'The number of spaces for indentation.',
          ui: {
            label: 'Indent Size',
            component: 'Input',
            attrs: {
              type: 'number',
              min: 2,
              max: 8,
            },
          },
        }),
      indentChar: z
        .string()
        .default(' ')
        .meta({
          description:
            'The character to use for indentation (e.g., \' \' or \'\\t\').',
          ui: {
            label: 'Indent Char',
            component: 'Input',
            attrs: {
              type: 'text',
            },
          },
        }),
      selectorSeparatorNewline: z
        .boolean()
        .default(true)
        .meta({
          description:
            'Whether to add a newline after each selector separator.',
          ui: {
            label: 'Selector Separator Newline',
            component: 'Checkbox',
            attrs: {},
          },
        }),
      endWithNewline: z
        .boolean()
        .default(false)
        .meta({
          description: 'Whether to end the output with a newline.',
          ui: {
            label: 'End with Newline',
            component: 'Checkbox',
            attrs: {},
          },
        }),
      newlineBetweenRules: z
        .boolean()
        .default(true)
        .meta({
          description: 'Whether to add a newline between rules.',
          ui: {
            label: 'Newline Between Rules',
            component: 'Checkbox',
            attrs: {},
          },
        }),
    }),
    output: z.string().meta({
      ui: {
        label: 'Beautified CSS',
        component: 'CodeMirror',
        attrs: {
          lang: 'css',
          style: 'min-height: 10rem;',
        },
      },
    }),
  },
  dependencies: ['js-beautify'],
  requiresInternet: false,
  tags: ['css', 'beautification'],
  related: ['css-minifier'],
})

export type Input = z.input<typeof schema.input>
export type Options = z.input<typeof schema.options>
export type Output = z.input<typeof schema.output>
