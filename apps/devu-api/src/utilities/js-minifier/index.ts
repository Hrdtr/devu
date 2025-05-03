import type { Input, Options, Output } from './definition'
import { minify } from 'terser'
import { schema } from './definition'

export * from './definition'

/**
 * Minifies a JavaScript string.
 */
export async function invoke(input: Input, options?: Options): Promise<Output> {
  const jsString = schema.input.parse(input)
  const { mangle, compress } = schema.options.parse(options ?? {})

  const minified = await minify(jsString, {
    mangle,
    compress,
  })
  return schema.output.parse(minified.code || '')
}

export const minifyJS = invoke
