import { z } from 'zod'
import { createDefinition } from '../_shared/create-definition'

export const { meta, schema } = createDefinition({
  id: 'json-to-yaml',
  name: 'JSON to YAML',
  description: 'Converts a JSON string to a YAML string.',
  icon: undefined,
  schema: {
    input: z.string().meta({
      description: 'The JSON string to convert to YAML.',
      ui: {
        label: 'JSON String',
        component: 'CodeMirror',
        attrs: {
          lang: 'json',
          style: 'min-height: 10rem;',
        },
      },
    }),
    options: z.interface({
      'indent?': z.number().meta({
        description: 'The indentation width to use.',
        ui: {
          label: 'Indent',
          component: 'Input',
          attrs: {
            type: 'number',
          },
        },
      }),
      'lineWidth?': z.number().meta({
        description: 'The maximum line width.',
        ui: {
          label: 'Line Width',
          component: 'Input',
          attrs: {
            type: 'number',
          },
        },
      }),
      'noRefs?': z.boolean().meta({
        description: 'Don\'t generate references anchors and aliases.',
        ui: {
          label: 'No Refs',
          component: 'Checkbox',
          attrs: {},
        },
      }),
      'sortKeys?': z.boolean().meta({
        description: 'Sort keys when dumping YAML.',
        ui: {
          label: 'Sort Keys',
          component: 'Checkbox',
          attrs: {},
        },
      }),
    }),
    output: z.string().meta({
      ui: {
        label: 'YAML String',
        component: 'CodeMirror',
        attrs: {
          lang: 'yaml',
          style: 'min-height: 10rem;',
        },
      },
    }),
  },
  dependencies: ['js-yaml'],
  requiresInternet: false,
  tags: ['json', 'yaml', 'converter'],
  related: ['yaml-to-json'],
})

export type Input = z.infer<typeof schema.input>
export type Options = z.infer<
  typeof schema.options extends undefined
    ? z.ZodUndefined
    : NonNullable<typeof schema.options>
>
export type Output = z.infer<typeof schema.output>
