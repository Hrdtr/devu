import { z } from 'zod/v4'
import { createDefinition } from '../_shared/create-definition'

export const { meta, schema } = createDefinition({
  id: 'html-beautifier',
  name: 'HTML Beautifier',
  description: 'Formats an HTML string.',
  icon: undefined,
  schema: {
    input: z.string().meta({
      description: 'The HTML string to beautify.',
      ui: {
        label: 'HTML String',
        component: 'CodeMirror',
        attrs: {
          lang: 'html',
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
      wrapLineLength: z
        .number()
        .default(0)
        .meta({
          description: 'The maximum line length before wrapping.',
          ui: {
            label: 'Wrap Line Length',
            component: 'Input',
            attrs: {
              type: 'number',
              min: 0,
            },
          },
        }),
      unformatted: z
        .array(z.string())
        .default([])
        .meta({
          description: 'An array of tags that should not be formatted.',
          ui: {
            label: 'Unformatted Tags',
            component: 'TagsInput',
            attrs: {},
          },
        }),
      preserveNewlines: z
        .boolean()
        .default(true)
        .meta({
          description: 'Whether to preserve existing newlines.',
          ui: {
            label: 'Preserve Newlines',
            component: 'Checkbox',
            attrs: {},
          },
        }),
      maxPreserveNewlines: z
        .number()
        .default(3)
        .meta({
          description:
            'The maximum number of consecutive newlines to preserve.',
          ui: {
            label: 'Max Preserve Newlines',
            component: 'Input',
            attrs: {
              type: 'number',
              min: 0,
            },
          },
        }),
    }),
    output: z.string().meta({
      ui: {
        label: 'Beautified HTML',
        component: 'CodeMirror',
        attrs: {
          lang: 'html',
          style: 'min-height: 10rem;',
        },
      },
    }),
  },
  dependencies: ['js-beautify'],
  requiresInternet: false,
  tags: ['html', 'beautification'],
  related: ['html-minifier'],
})

export type Input = z.input<typeof schema.input>
export type Options = z.input<typeof schema.options>
export type Output = z.input<typeof schema.output>
