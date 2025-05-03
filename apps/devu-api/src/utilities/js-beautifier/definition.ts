import { z } from 'zod'
import { createDefinition } from '../_shared/create-definition'

export const { meta, schema } = createDefinition({
  id: 'js-beautifier',
  name: 'JS Beautifier',
  description: 'Formats a JavaScript string.',
  icon: undefined,
  schema: {
    input: z.string().meta({
      description: 'The JavaScript string to beautify.',
      ui: {
        label: 'JavaScript String',
        component: 'CodeMirror',
        attrs: {
          lang: 'javascript',
          style: 'min-height: 10rem;',
        },
      },
    }),
    options: z.interface({
      'indentSize?': z
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
      'indentChar?': z
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
      'indentLevel?': z
        .number()
        .default(0)
        .meta({
          description: 'Initial indentation level.',
          ui: {
            label: 'Indent Level',
            component: 'Input',
            attrs: {
              type: 'number',
              min: 0,
            },
          },
        }),
      'indentWithTabs?': z
        .boolean()
        .default(false)
        .meta({
          description: 'Indent with tabs, not spaces.',
          ui: {
            label: 'Indent With Tabs',
            component: 'Checkbox',
            attrs: {},
          },
        }),
      'maxPreserveNewlines?': z
        .number()
        .default(3)
        .meta({
          description:
            'Maximum number of line breaks to be preserved in one chunk.',
          ui: {
            label: 'Max Preserve Newlines',
            component: 'Input',
            attrs: {
              type: 'number',
              min: 0,
            },
          },
        }),
      'preserveNewlines?': z
        .boolean()
        .default(true)
        .meta({
          description: 'Whether existing line breaks should be preserved.',
          ui: {
            label: 'Preserve Newlines',
            component: 'Checkbox',
            attrs: {},
          },
        }),
      'spaceInParen?': z
        .boolean()
        .default(false)
        .meta({
          description: 'Add padding spaces within parentheses.',
          ui: {
            label: 'Space In Parentheses',
            component: 'Checkbox',
            attrs: {},
          },
        }),
      'spaceInEmptyParen?': z
        .boolean()
        .default(false)
        .meta({
          description: 'Add padding spaces within empty parentheses.',
          ui: {
            label: 'Space In Empty Parentheses',
            component: 'Checkbox',
            attrs: {},
          },
        }),
      'jslintHappy?': z
        .boolean()
        .default(false)
        .meta({
          description: 'Enable jslint-happy mode.',
          ui: {
            label: 'JSLint Happy',
            component: 'Checkbox',
            attrs: {},
          },
        }),
      'spaceAfterAnonFunction?': z
        .boolean()
        .default(false)
        .meta({
          description:
            'Add a space before an anonymous function\'s parentheses, i.e. function ()',
          ui: {
            label: 'Space After Anonymous Function',
            component: 'Checkbox',
            attrs: {},
          },
        }),
      'braceStyle?': z
        .enum(['collapse', 'expand', 'end-expand', 'none'])
        .default('collapse')
        .meta({
          description: 'Brace style (collapse, expand, end-expand, none).',
          ui: {
            label: 'Brace Style',
            component: 'Select',
            attrs: {},
          },
        }),
      'unindentChainedMethods?': z
        .boolean()
        .default(false)
        .meta({
          description: 'Try to keep array indentation.',
          ui: {
            label: 'Unindent Chained Methods',
            component: 'Checkbox',
            attrs: {},
          },
        }),
      'breakChainedMethods?': z
        .boolean()
        .default(false)
        .meta({
          description: 'Break chained method calls across newlines.',
          ui: {
            label: 'Break Chained Methods',
            component: 'Checkbox',
            attrs: {},
          },
        }),
      'keepArrayIndentation?': z
        .boolean()
        .default(false)
        .meta({
          description: 'Keep array indentation.',
          ui: {
            label: 'Keep Array Indentation',
            component: 'Checkbox',
            attrs: {},
          },
        }),
      'commaFirst?': z
        .boolean()
        .default(false)
        .meta({
          description:
            'Put commas on the first line forMultiline arrays/objects.',
          ui: {
            label: 'Comma First',
            component: 'Checkbox',
            attrs: {},
          },
        }),
      'e4x?': z
        .boolean()
        .default(false)
        .meta({
          description: 'Support e4x.',
          ui: {
            label: 'E4X',
            component: 'Checkbox',
            attrs: {},
          },
        }),
      'endWithNewline?': z
        .boolean()
        .default(false)
        .meta({
          description: 'End output with newline.',
          ui: {
            label: 'End With Newline',
            component: 'Checkbox',
            attrs: {},
          },
        }),
      'spaceAfterNamedFunction?': z
        .boolean()
        .default(false)
        .meta({
          description:
            'Add a space before a named function\'s parentheses, i.e. function example ()',
          ui: {
            label: 'Space After Named Function',
            component: 'Checkbox',
            attrs: {},
          },
        }),
      'eol?': z
        .string()
        .default('\\n')
        .meta({
          description: 'Character(s) to use as line terminators.',
          ui: {
            label: 'EOL',
            component: 'Input',
            attrs: {
              type: 'text',
            },
          },
        }),
      'unescapeStrings?': z
        .boolean()
        .default(false)
        .meta({
          description: 'Decode printable characters encoded in xNN notation.',
          ui: {
            label: 'Unescape Strings',
            component: 'Checkbox',
            attrs: {},
          },
        }),
      'wrapLineLength?': z
        .number()
        .default(0)
        .meta({
          description: 'Maximum characters per line (0 = disable).',
          ui: {
            label: 'Wrap Line Length',
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
        label: 'Beautified JavaScript',
        component: 'CodeMirror',
        attrs: {
          lang: 'javascript',
          style: 'min-height: 10rem;',
        },
      },
    }),
  },
  dependencies: ['js-beautify'],
  requiresInternet: false,
  tags: ['javascript', 'beautification'],
  related: ['js-minifier'],
})

export type Input = z.infer<typeof schema.input>
export type Options = z.infer<typeof schema.options>
export type Output = z.infer<typeof schema.output>
