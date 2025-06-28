import { z } from 'zod/v4'
import { createDefinition } from '../_shared/create-definition'

export const { meta, schema } = createDefinition({
  meta: {
    id: 'python',
    name: 'Python',
    description: 'Python code interpreter. Uses Pyodide under the hood.',
    icon: undefined,
    kind: 'language',
    referenceUrl: 'https://pyodide.org/en/stable/index.html',
    tags: ['py', 'python', 'pyodide'],
    related: [],
  },
  schema: {
    input: z.object({
      python: z.string().meta({
        default: `import statistics

statistics.stdev(rank)
`,
        ui: {
          label: 'Python',
          attrs: { lang: 'python' },
        },
      }),
    }),
    options: z.object({
      context: z.record(z.string(), z.any())
        .meta({
          description: 'Additional global context to pass to the interpreter.',
          default: {
            rank: [0.8, 0.4, 1.2, 3.7, 2.6, 5.8],
          },
          ui: {
            label: 'Context',
            component: 'CodeMirror',
            attrs: {
              lang: 'json',
              style: 'min-height: 6rem;',
            },
          },
        }),
    }),
    output: z.object({
      stdio: z.literal(true),
      result: z.object({
        default: z.string().meta({
          ui: {
            label: 'Terminal',
            component: 'stdio',
          },
        }),
      }),
    }),
  },
})

export type Input = z.input<typeof schema.input>
export type Options = z.input<typeof schema.options>
export type Output = z.input<typeof schema.output>
