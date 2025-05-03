import { z } from 'zod'
import { createDefinition } from '../_shared/create-definition'

export const { meta, schema } = createDefinition({
  id: 'number-base-converter',
  name: 'Number Base Converter',
  description: 'Converts a number from one base to another.',
  icon: undefined,
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
    options: z.interface({
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
  dependencies: [],
  requiresInternet: false,
  tags: ['number', 'base', 'converter'],
  related: [],
})

export type Input = z.infer<typeof schema.input>
export type Options = z.infer<typeof schema.options>
export type Output = z.infer<typeof schema.output>
