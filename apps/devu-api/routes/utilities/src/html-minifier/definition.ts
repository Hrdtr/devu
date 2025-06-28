import { z } from 'zod/v4'
import { createDefinition } from '../_shared/create-definition'

export const { meta, schema } = createDefinition({
  meta: {
    id: 'html-minifier',
    name: 'HTML Minifier',
    description: 'Minifies an HTML string.',
    icon: undefined,
    requiresInternet: false,
    tags: ['html', 'minification'],
    related: ['html-beautifier'],
  },
  schema: {
    input: z.string().meta({
      description: 'The HTML string to minify.',
      ui: {
        label: 'HTML String',
        component: 'CodeMirror',
        attrs: {
          lang: 'html',
          style: 'min-height: 10rem;',
        },
      },
    }),
    options: z.object({
      removeComments: z
        .boolean()
        .default(true)
        .meta({
          description: 'Whether to remove HTML comments.',
          ui: {
            label: 'Remove Comments',
            component: 'Checkbox',
            attrs: {},
          },
        }),
      collapseWhitespace: z
        .boolean()
        .default(true)
        .meta({
          description: 'Whether to collapse whitespace.',
          ui: {
            label: 'Collapse Whitespace',
            component: 'Checkbox',
            attrs: {},
          },
        }),
      minifyCSS: z
        .boolean()
        .default(true)
        .meta({
          description:
            'Whether to minify CSS in <style> elements and style attributes.',
          ui: {
            label: 'Minify CSS',
            component: 'Checkbox',
            attrs: {},
          },
        }),
      minifyJS: z
        .boolean()
        .default(true)
        .meta({
          description:
            'Whether to minify JavaScript in <script> elements and event attributes.',
          ui: {
            label: 'Minify JS',
            component: 'Checkbox',
            attrs: {},
          },
        }),
      removeRedundantAttributes: z
        .boolean()
        .default(true)
        .meta({
          description:
            'Whether to remove attributes with boolean values from elements.',
          ui: {
            label: 'Remove Redundant Attributes',
            component: 'Checkbox',
            attrs: {},
          },
        }),
      removeScriptTypeAttributes: z
        .boolean()
        .default(true)
        .meta({
          description:
            'Whether to remove type="text/javascript" from <script> tags. Other type attribute values are left intact.',
          ui: {
            label: 'Remove Script Type Attributes',
            component: 'Checkbox',
            attrs: {},
          },
        }),
      removeStyleLinkTypeAttributes: z
        .boolean()
        .default(true)
        .meta({
          description:
            'Whether to remove type="text/css" from <style> and <link> tags. Other type attribute values are left intact.',
          ui: {
            label: 'Remove Style Link Type Attributes',
            component: 'Checkbox',
            attrs: {},
          },
        }),
      useShortDoctype: z
        .boolean()
        .default(true)
        .meta({
          description:
            'Whether to replace the doctype with the short HTML5 one.',
          ui: {
            label: 'Use Short Doctype',
            component: 'Checkbox',
            attrs: {},
          },
        }),
      keepClosingSlash: z
        .boolean()
        .default(false)
        .meta({
          description: 'Whether to keep the trailing slash on singleton tags.',
          ui: {
            label: 'Keep Closing Slash',
            component: 'Checkbox',
            attrs: {},
          },
        }),
    }),
    output: z.string().meta({
      ui: {
        label: 'Minified HTML',
        component: 'CodeMirror',
        attrs: {
          lang: 'html',
          style: 'min-height: 10rem;',
        },
      },
    }),
  },
})

export type Input = z.input<typeof schema.input>
export type Options = z.input<typeof schema.options>
export type Output = z.input<typeof schema.output>
