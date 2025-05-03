import { z } from 'zod'
import { createDefinition } from '../_shared/create-definition'

export const { meta, schema } = createDefinition({
  id: 'string-case-converter',
  name: 'String Case Converter',
  description: 'Converts string casing using scule.',
  icon: undefined,
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
    options: z.interface({
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
  dependencies: ['scule'],
  requiresInternet: false,
  tags: ['string', 'case', 'formatting'],
  related: [],
})

export type Input = z.infer<typeof schema.input>
export type Options = z.infer<typeof schema.options>
export type Output = z.infer<typeof schema.output>
