import type { Input, Options, Output } from './definition'
import CleanCSS from 'clean-css'
import { schema } from './definition'

export * from './definition'

/**
 * Minifies a CSS string.
 */
export async function invoke(input: Input, options?: Options): Promise<Output> {
  const cssString = schema.input.parse(input)
  const { level, format } = schema.options.parse(options ?? {})

  const minifiedCss = new CleanCSS({ level, format }).minify(cssString)
  return schema.output.parse(minifiedCss.styles)
}

export const minifyCSS = invoke
