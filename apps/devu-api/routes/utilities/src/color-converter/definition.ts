import { z } from 'zod/v4'
import { createDefinition } from '../_shared/create-definition'

export const { meta, schema } = createDefinition({
  id: 'color-converter',
  name: 'Color Converter',
  description: 'Converts between different color formats.',
  icon: undefined,
  schema: {
    input: z.string().meta({
      description: 'The color to convert.',
      ui: {
        label: 'Color',
        component: 'Input',
      },
    }),
    options: z.object({
      from: z
        .enum(['hex', 'rgb', 'rgba', 'hsl', 'hsla', 'cmyk', 'hwb'])
        .default('hex')
        .meta({
          description: 'The input color format.',
          ui: {
            label: 'From',
            component: 'Select',
            attrs: {},
          },
        }),
      to: z
        .enum(['hex', 'rgb', 'rgba', 'hsl', 'hsla', 'cmyk', 'hwb'])
        .default('rgb')
        .meta({
          description: 'The output color format.',
          ui: {
            label: 'To',
            component: 'Select',
            attrs: {},
          },
        }),
    }),
    output: z.string().meta({
      description: 'The converted color.',
      ui: {
        label: 'Converted Color',
        component: 'Input',
      },
    }),
  },
  requiresInternet: false,
  tags: ['color', 'converter'],
  related: [],
})

export type Input = z.input<typeof schema.input>
export type Options = z.input<typeof schema.options>
export type Output = z.input<typeof schema.output>
