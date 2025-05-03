import type { Input, Options, Output } from './definition'
import { Parser } from '@json2csv/plainjs'
import { schema } from './definition'

export * from './definition'

export async function invoke(input: Input, options?: Options): Promise<Output> {
  const jsonString = schema.input.parse(input)
  const {
    fields,
    delimiter,
    eol,
    header,
    includeEmptyRows,
    withBOM,
    defaultValue,
  } = schema.options.parse(options ?? {})

  const jsonObject = JSON.parse(jsonString)
  const parser = new Parser({
    fields: fields && fields.length > 0 ? fields : undefined,
    delimiter,
    eol,
    header,
    includeEmptyRows,
    withBOM,
    defaultValue,
  })
  const csvString = parser.parse(jsonObject)
  return schema.output.parse(csvString)
}

export const jsonToCSV = invoke
