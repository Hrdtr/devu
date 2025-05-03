import type { Input, Options, Output } from './definition'
import { js } from 'js-beautify'
import { schema } from './definition'

export * from './definition'

/**
 * Formats a JavaScript string with specified indentation.
 */
export async function invoke(input: Input, options?: Options): Promise<Output> {
  const jsString = schema.input.parse(input)
  const {
    indentSize: indent_size,
    indentChar: indent_char,
    indentLevel: indent_level,
    indentWithTabs: indent_with_tabs,
    maxPreserveNewlines: max_preserve_newlines,
    preserveNewlines: preserve_newlines,
    spaceInParen: space_in_paren,
    spaceInEmptyParen: space_in_empty_paren,
    jslintHappy: jslint_happy,
    spaceAfterAnonFunction: space_after_anon_function,
    braceStyle: brace_style,
    unindentChainedMethods: unindent_chained_methods,
    breakChainedMethods: break_chained_methods,
    keepArrayIndentation: keep_array_indentation,
    commaFirst: comma_first,
    e4x,
    endWithNewline: end_with_newline,
    spaceAfterNamedFunction: space_after_named_function,
    eol,
    unescapeStrings: unescape_strings,
    wrapLineLength: wrap_line_length,
  } = schema.options.parse(options ?? {})

  const formattedJs = js(jsString, {
    indent_size,
    indent_char,
    indent_level,
    indent_with_tabs,
    max_preserve_newlines,
    preserve_newlines,
    space_in_paren,
    space_in_empty_paren,
    jslint_happy,
    space_after_anon_function,
    brace_style,
    unindent_chained_methods,
    break_chained_methods,
    keep_array_indentation,
    comma_first,
    e4x,
    end_with_newline,
    space_after_named_function,
    eol,
    unescape_strings,
    wrap_line_length,
  })
  return schema.output.parse(formattedJs)
}

export const beautifyJS = invoke
