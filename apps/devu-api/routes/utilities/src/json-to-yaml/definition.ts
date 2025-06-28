import { z } from 'zod/v4'
import { createDefinition } from '../_shared/create-definition'

export const { meta, schema } = createDefinition({
  meta: {
    id: 'json-to-yaml',
    name: 'JSON to YAML',
    description: 'Converts a JSON string to a YAML string.',
    icon: undefined,
    requiresInternet: false,
    tags: ['json', 'yaml', 'converter'],
    related: ['yaml-to-json'],
  },
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
    options: z.object({
      indent: z
        .number()
        .optional()
        .meta({
          description: 'The indentation width to use.',
          ui: {
            label: 'Indent',
            component: 'Input',
            attrs: {
              type: 'number',
            },
          },
        }),
      lineWidth: z
        .number()
        .optional()
        .meta({
          description: 'The maximum line width.',
          ui: {
            label: 'Line Width',
            component: 'Input',
            attrs: {
              type: 'number',
            },
          },
        }),
      noRefs: z
        .boolean()
        .optional()
        .meta({
          description: 'Don\'t generate references anchors and aliases.',
          ui: {
            label: 'No Refs',
            component: 'Checkbox',
            attrs: {},
          },
        }),
      sortKeys: z
        .boolean()
        .optional()
        .meta({
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
})

export type Input = z.input<typeof schema.input>
export type Options = z.infer<
  typeof schema.options extends undefined
    ? z.ZodUndefined
    : NonNullable<typeof schema.options>
>
export type Output = z.input<typeof schema.output>
