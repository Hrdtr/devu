import type { Input, Options, Output } from './definition'
import { minify } from 'html-minifier-terser'
import { schema } from './definition'

export * from './definition'

/**
 * Minifies an HTML string.
 */
export async function invoke(input: Input, options?: Options): Promise<Output> {
  const htmlString = schema.input.parse(input)
  const {
    removeComments,
    collapseWhitespace,
    minifyCSS,
    minifyJS,
    removeRedundantAttributes,
    removeScriptTypeAttributes,
    removeStyleLinkTypeAttributes,
    useShortDoctype,
    keepClosingSlash,
  } = schema.options.parse(options ?? {})

  const minifiedHtml = await minify(htmlString, {
    removeComments,
    collapseWhitespace,
    minifyCSS,
    minifyJS,
    removeRedundantAttributes,
    removeScriptTypeAttributes,
    removeStyleLinkTypeAttributes,
    useShortDoctype,
    keepClosingSlash,
  })
  return schema.output.parse(minifiedHtml)
}

export const minifyHTML = invoke
