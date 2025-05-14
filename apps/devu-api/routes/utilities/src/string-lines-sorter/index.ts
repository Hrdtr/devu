import type { Input, Options, Output } from './definition'
import { schema } from './definition'

export * from './definition'

/**
 * Sorts lines in a string.
 */
export async function invoke(input: Input, options?: Options): Promise<Output> {
  const string = schema.input.parse(input)
  const { deduplicate, order, caseInsensitive } = schema.options.parse(
    options ?? {},
  )

  const lines = string.split('\n')
  let sortedLines = [...lines]

  if (caseInsensitive) {
    sortedLines.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
  }
  else {
    sortedLines.sort()
  }

  if (deduplicate) {
    sortedLines = [...new Set(sortedLines)]
  }

  if (order === 'desc') {
    sortedLines = sortedLines.reverse()
  }

  const result = sortedLines.join('\n')
  return schema.output.parse(result)
}

export const sortLines = invoke
