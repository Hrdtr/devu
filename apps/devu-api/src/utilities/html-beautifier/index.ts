import type { Input, Options, Output } from './definition'
import { html } from 'js-beautify'
import { schema } from './definition'

export * from './definition'

/**
 * Formats an HTML string with specified indentation.
 */
export async function invoke(input: Input, options?: Options): Promise<Output> {
  const htmlString = schema.input.parse(input)
  const {
    indentSize: indent_size,
    indentChar: indent_char,
    wrapLineLength: wrap_line_length,
    unformatted,
    preserveNewlines: preserve_newlines,
    maxPreserveNewlines: max_preserve_newlines,
  } = schema.options.parse(options ?? {})

  const formattedHtml = html(htmlString, {
    indent_size,
    indent_char,
    wrap_line_length,
    unformatted,
    preserve_newlines,
    max_preserve_newlines,
  })
  return schema.output.parse(formattedHtml)
}

export const beautifyHTML = invoke
