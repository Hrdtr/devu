import type { Input /* , Options */, Output } from './definition'
import { schema } from './definition'

export * from './definition'

export async function invoke(
  input: Input, /* , options?: Options */
): Promise<Output> {
  const urlString = schema.input.parse(input)
  // const {} = schema.options.parse(options)

  const parsedUrl = new URL(urlString)
  return schema.output.parse({
    protocol: parsedUrl.protocol,
    hostname: parsedUrl.hostname,
    port: parsedUrl.port,
    pathname: parsedUrl.pathname,
    search: parsedUrl.search,
    hash: parsedUrl.hash,
    origin: parsedUrl.origin,
  })
}

export const parseURL = invoke
