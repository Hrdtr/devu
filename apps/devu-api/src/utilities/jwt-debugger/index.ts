import type { Input, Options, Output } from './definition'
import jwt from 'jsonwebtoken'
import { schema } from './definition'

export * from './definition'

export async function invoke(input: Input, options: Options): Promise<Output> {
  const { algorithm, secret } = schema.options.parse(options)
  const token = schema.input.parse(input)

  let decodedHeader: any
  let decodedPayload: any
  let signature = ''
  let signatureVerified = false

  const decoded = jwt.decode(token, { complete: true })
  if (!decoded) {
    throw new Error('Invalid JWT token')
  }

  decodedHeader = decoded.header // eslint-disable-line prefer-const
  decodedPayload = decoded.payload // eslint-disable-line prefer-const
  signature = decoded.signature

  // Verify the signature
  if (secret) {
    try {
      jwt.verify(token, secret, { algorithms: [algorithm] as any })
      signatureVerified = true
    }
    catch {}
  }

  return schema.output.parse({
    header: JSON.stringify(decodedHeader, null, 2),
    payload: JSON.stringify(decodedPayload, null, 2),
    signature,
    signatureVerified,
  })
}

export const jwtDebugger = invoke
