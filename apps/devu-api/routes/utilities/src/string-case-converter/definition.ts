import { z } from 'zod/v4'
import { createDefinition } from '../_shared/create-definition'

export const { meta, schema } = createDefinition({
  meta: {
    id: 'string-case-converter',
    name: 'String Case Converter',
    description: 'Converts string casing using scule.',
    icon: undefined,
    requiresInternet: false,
    tags: ['string', 'case', 'formatting'],
    related: [],
  },
  schema: {
    input: z.string().meta({
      description: 'The string to convert.',
      ui: {
        label: 'String',
        component: 'Input',
        attrs: {
          type: 'text',
        },
      },
    }),
    options: z.object({
      targetCase: z
        .enum([
          'camel',
          'pascal',
          'snake',
          'kebab',
          'flat',
          'train',
          'title',
          'upperFirst',
          'lowerFirst',
        ])
        .meta({
          description: 'The target case to convert the string to.',
          ui: {
            label: 'Target Case',
            component: 'Select',
            attrs: {},
          },
        }),
    }),
    output: z.string().meta({
      ui: {
        label: 'Converted String',
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
