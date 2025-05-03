import { z } from 'zod'
import { createDefinition } from '../_shared/create-definition'

export const { meta, schema } = createDefinition({
  id: 'css-minifier',
  name: 'CSS Minifier',
  description: 'Minifies a CSS string.',
  icon: undefined,
  schema: {
    input: z.string().meta({
      description: 'The CSS string to minify.',
      ui: {
        label: 'CSS String',
        component: 'CodeMirror',
        attrs: {
          lang: 'css',
          style: 'min-height: 10rem;',
        },
      },
    }),
    options: z.interface({
      'level?': z
        .interface({
          '1?': z
            .interface({
              'all?': z
                .boolean()
                .default(true)
                .meta({
                  description: 'Whether to apply all level 1 optimizations.',
                  ui: {
                    label: 'All',
                    component: 'Checkbox',
                    attrs: {},
                  },
                }),
            })
            .default({ all: true })
            .meta({
              description: 'Level 1 optimizations.',
              ui: {
                label: 'Level 1',
                component: 'fieldset',
                attrs: {},
              },
            }),
          '2?': z
            .interface({
              'restructureRules?': z
                .boolean()
                .default(false)
                .meta({
                  description:
                    'Whether to restructure rules (potentially unsafe).',
                  ui: {
                    label: 'Restructure Rules',
                    component: 'Checkbox',
                    attrs: {},
                  },
                }),
            })
            .default({ restructureRules: false })
            .meta({
              description: 'Level 2 optimizations.',
              ui: {
                label: 'Level 2',
                component: 'fieldset',
                attrs: {},
              },
            }),
        })
        .default({})
        .meta({
          description: 'The level of optimization to apply.',
          ui: {
            label: 'Level',
            component: 'fieldset',
            attrs: {},
          },
        }),
      'format?': z
        .interface({
          'wrapAt?': z
            .number()
            .default(0)
            .meta({
              description: 'Whether to wrap the output at a certain length.',
              ui: {
                label: 'Wrap At',
                component: 'Input',
                attrs: {
                  type: 'number',
                  min: 0,
                },
              },
            }),
        })
        .default({})
        .meta({
          description: 'Formatting options.',
          ui: {
            label: 'Format',
            component: 'fieldset',
            attrs: {},
          },
        }),
    }),
    output: z.string().meta({
      ui: {
        label: 'Minified CSS',
        component: 'CodeMirror',
        attrs: {
          lang: 'css',
          style: 'min-height: 10rem;',
        },
      },
    }),
  },
  dependencies: ['clean-css'],
  requiresInternet: false,
  tags: ['css', 'minification'],
  related: ['css-beautifier'],
})

export type Input = z.infer<typeof schema.input>
export type Options = z.infer<typeof schema.options>
export type Output = z.infer<typeof schema.output>
