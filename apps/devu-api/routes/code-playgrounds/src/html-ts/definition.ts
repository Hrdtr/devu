import { z } from 'zod/v4'
import { createDefinition } from '../_shared/create-definition'

export const { meta, schema } = createDefinition({
  meta: {
    id: 'html-ts',
    name: 'HTML w/ TS',
    description: 'Playground to experiment with HTML, CSS, and TS (Browser).',
    icon: undefined,
    kind: 'framework',
    referenceUrl: undefined,
    tags: ['html', 'css', 'ts', 'frontend'],
    related: [],
  },
  schema: {
    input: z.object({
      html: z.string().meta({
        default: `<h1>Hello, TS!</h1>
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
      ts: z.string().meta({
        default: `import { ofetch } from 'ofetch' // https://esm.sh/ofetch

try {
  const res = await ofetch<Todo>('https://jsonplaceholder.typicode.com/todos/1')
  console.table(res)

  const pre = document.createElement('pre')
  pre.innerHTML = JSON.stringify(res, null, 2)
  appendToBody(pre)
}
catch (error) {
  console.error(error)
}

function appendToBody(el: HTMLElement) {
  document.body.appendChild(el)
}

interface Todo {
  userId: number,
  id: number,
  title: string
  completed: false
}
`,
        ui: {
          label: 'TS',
          attrs: {
            lang: 'typescript',
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
      tsCompilerOptions: z.record(z.string(), z.any())
        .meta({
          description: `TypeScript Compiler Options.  
Avoid specifying \`outDir\` or \`rootDir\`, since transpilation happens in-memory and doesn’t need file outputs.  
Skip \`lib\` and \`types\`—there’s no integrated LSP or type-checking here.  
Avoid Node-specific settings like \`"moduleResolution": "node"\`, since the output will run directly in the browser.  
Remember, the output will be executed as-is in the browser environment—so keep your config browser-friendly, and ensure your modules (ESM) and features (like \`target\`) align with modern browser support.`,
          default: {
            target: 'ESNext',
            module: 'ESNext',
            moduleResolution: 'bundler',
            strict: true,
            jsx: 'preserve',
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            forceConsistentCasingInFileNames: true,
          },
          ui: {
            label: 'TS Config',
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
        transpiledTs: z.string().meta({
          ui: {
            label: 'Transpiled TS',
            component: 'CodeMirror',
            attrs: { lang: 'javascript' },
          },
        }),
      }),
    }),
  },
})

export type Input = z.input<typeof schema.input>
export type Options = z.input<typeof schema.options>
export type Output = z.input<typeof schema.output>
