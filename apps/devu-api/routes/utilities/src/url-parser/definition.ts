import { z } from 'zod/v4'
import { createDefinition } from '../_shared/create-definition'

export const { meta, schema } = createDefinition({
  id: 'url-parser',
  name: 'URL Parser',
  description: 'Parses a URL string into its components.',
  icon: undefined,
  schema: {
    input: z
      .string()
      .url()
      .meta({
        description: 'The URL to parse.',
        ui: {
          label: 'URL',
          component: 'Input',
          attrs: {
            type: 'url',
          },
        },
      }),
    options: z.null(),
    output: z.object({
      protocol: z.string().meta({
        description: 'The protocol of the URL (e.g., "https:").',
        ui: {
          label: 'Protocol',
          component: 'Input',
          attrs: {
            type: 'text',
          },
        },
      }),
      hostname: z.string().meta({
        description: 'The hostname of the URL (e.g., "example.com").',
        ui: {
          label: 'Hostname',
          component: 'Input',
          attrs: {
            type: 'text',
          },
        },
      }),
      port: z.string().meta({
        description: 'The port of the URL (e.g., "8080").',
        ui: {
          label: 'Port',
          component: 'Input',
          attrs: {
            type: 'text',
          },
        },
      }),
      pathname: z.string().meta({
        description: 'The path of the URL (e.g., "/path/to/resource").',
        ui: {
          label: 'Pathname',
          component: 'Input',
          attrs: {
            type: 'text',
          },
        },
      }),
      search: z.string().meta({
        description:
          'The search string of the URL, including the leading question mark (e.g., "?query=value").',
        ui: {
          label: 'Search',
          component: 'Input',
          attrs: {
            type: 'text',
          },
        },
      }),
      hash: z.string().meta({
        description:
          'The hash fragment of the URL, including the leading hash symbol (e.g., "#fragment").',
        ui: {
          label: 'Hash',
          component: 'Input',
          attrs: {
            type: 'text',
          },
        },
      }),
      origin: z.string().meta({
        description: 'The origin of the URL (e.g., "https://example.com").',
        ui: {
          label: 'Origin',
          component: 'Input',
          attrs: {
            type: 'text',
          },
        },
      }),
    }),
  },
  requiresInternet: false,
  tags: ['url', 'parser'],
  related: [],
})

export type Input = z.input<typeof schema.input>
export type Options = z.input<typeof schema.options>
export type Output = z.input<typeof schema.output>
