import { z } from 'zod/v4'
import { createDefinition } from '../_shared/create-definition'

export const { meta, schema } = createDefinition({
  meta: {
    id: 'number-base-converter',
    name: 'Number Base Converter',
    description: 'Converts a number from one base to another.',
    icon: undefined,
    requiresInternet: false,
    tags: ['number', 'base', 'converter'],
    related: [],
  },
  schema: {
    input: z.string().meta({
      description: 'The number to convert.',
      ui: {
        label: 'Number',
        component: 'Input',
        attrs: {
          type: 'text',
        },
      },
    }),
    options: z.object({
      fromBase: z
        .number()
        .min(2)
        .max(36)
        .meta({
          description: 'The base of the number to convert from.',
          ui: {
            label: 'From Base',
            component: 'Input',
            attrs: {
              type: 'number',
              min: 2,
              max: 36,
            },
          },
        }),
      toBase: z
        .number()
        .min(2)
        .max(36)
        .meta({
          description: 'The base to convert the number to.',
          ui: {
            label: 'To Base',
            component: 'Input',
            attrs: {
              type: 'number',
              min: 2,
              max: 36,
            },
          },
        }),
    }),
    output: z.string().meta({
      ui: {
        label: 'Converted Number',
        component: 'Input',
        attrs: {
          type: 'text',
        },
      },
    }),
  },
})

export type Input = z.input<typeof schema.input>
export type Options = z.input<typeof schema.options>
export type Output = z.input<typeof schema.output>
