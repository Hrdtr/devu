import type { Input, Options, Output } from './definition'
import { css } from 'js-beautify'
import { schema } from './definition'

export * from './definition'

/**
 * Formats a CSS string with specified indentation.
 */
export async function invoke(input: Input, options?: Options): Promise<Output> {
  const cssString = schema.input.parse(input)
  const {
    indentSize: indent_size,
    indentChar: indent_char,
    selectorSeparatorNewline: selector_separator_newline,
    endWithNewline: end_with_newline,
    newlineBetweenRules: newline_between_rules,
  } = schema.options.parse(options ?? {})

  const formattedCSS = css(cssString, {
    indent_size,
    indent_char,
    selector_separator_newline,
    end_with_newline,
    newline_between_rules,
  })

  return schema.output.parse(formattedCSS)
}

export const beautifyCSS = invoke
