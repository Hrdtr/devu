import { z } from 'zod/v4'
import { createDefinition } from '../_shared/create-definition'

export const { meta, schema } = createDefinition({
  meta: {
    id: 'html',
    name: 'HTML',
    description: 'Playground to experiment with HTML, CSS, and JS (Browser).',
    icon: undefined,
    kind: 'framework',
    referenceUrl: undefined,
    tags: ['html', 'css', 'js', 'frontend'],
    related: [],
  },
  schema: {
    input: z.object({
      html: z.string().meta({
        default: `<h1>Hello, world!</h1>
`,
        ui: {
          label: 'HTML',
          attrs: { lang: 'html' },
        },
      }),
      css: z.string().meta({
        default: `pre {
  line-height: 1.5
}
`,
        ui: {
          label: 'CSS',
          attrs: { lang: 'css' },
        },
      }),
      js: z.string().meta({
        default: `import { ofetch } from 'ofetch' // https://esm.sh/ofetch

try {
  const res = await ofetch('https://jsonplaceholder.typicode.com/todos/1')
  console.table(res)

  const pre = document.createElement('pre')
  pre.innerHTML = JSON.stringify(res, null, 2)
  appendToBody(pre)
}
catch (error) {
  console.error(error)
}

function appendToBody(el) {
  document.body.appendChild(el)
}
`,
        ui: {
          label: 'JS',
          attrs: {
            lang: 'javascript',
          },
        },
      }),
    }),
    options: z.object({
      rootAttributes: z.string()
        .meta({
          description: 'Additional HTML attributes to add to the `<html>` tag.',
          default: 'lang="en" class=""',
          ui: {
            label: 'HTML Tag Attributes',
            component: 'CodeMirror',
            attrs: {
              lang: undefined,
              style: 'min-height: 3rem;',
            },
          },
        }),

      additionalHeadChildren: z.string()
        .meta({
          description: 'Additional HTML to add to the `<head>` tag.',
          default: `<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />`,
          ui: {
            label: 'Additional Head Children',
            component: 'CodeMirror',
            attrs: {
              lang: 'html',
              style: 'min-height: 6rem;',
            },
          },
        }),

      importMap: z.record(z.string(), z.url())
        .meta({
          description: 'Main JS module import map to use.',
          default: {
            ofetch: 'https://esm.sh/ofetch',
          },
          ui: {
            label: 'Import Map',
            component: 'CodeMirror',
            attrs: {
              lang: 'json',
              style: 'min-height: 6rem;',
            },
          },
        }),
    }),
    output: z.object({
      stdio: z.literal(false),
      result: z.object({
        default: z.string().meta({
          ui: {
            label: 'Result',
            component: 'iframe',
          },
        }),
      }),
    }),
  },
})

export type Input = z.input<typeof schema.input>
export type Options = z.input<typeof schema.options>
export type Output = z.input<typeof schema.output>
