import type { Input, Options, Output } from './definition'
import { Readable } from 'node:stream'
import csv from 'csv-parser'
import { schema } from './definition'

export * from './definition'

export async function invoke(input: Input, options?: Options): Promise<Output> {
  const csvString = schema.input.parse(input)
  const { separator, headers, skipComments, skipLines, strict }
    = schema.options.parse(options ?? {})

  const results: any[] = []
  let headerArray: string[] | boolean | undefined = headers
    ? headers.split(',').map(header => header.trim())
    : undefined
  if (headerArray?.length === 1 && headerArray[0] === 'false') {
    headerArray = false
  }
  else if (headers === '') {
    headerArray = undefined
  }

  const readableStream = Readable.from(csvString)
  await new Promise((resolve, reject) => {
    readableStream
      .pipe(
        csv({
          separator,
          skipComments,
          skipLines,
          strict,
          headers: headerArray,
        }),
      )
      .on('data', (data: any) => results.push(data))
      .on('end', () => {
        resolve(results)
      })
      .on('error', (error: any) => {
        reject(error)
      })
  })

  const jsonString = JSON.stringify(results, null, 2)
  return schema.output.parse(jsonString)
}

export const csvToJSON = invoke
