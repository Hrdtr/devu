import { describe, expect, it } from 'bun:test'
import jwt from 'jsonwebtoken'
import { invoke } from '../index'

describe('jwt-debugger', () => {
  const payload = { sub: '1234567890', name: 'John Doe', iat: 1516239022 }
  const secret = 'secret'

  it('should decode a valid JWT token with HS256 algorithm', async () => {
    const token = jwt.sign(payload, secret, { algorithm: 'HS256' })
    const decoded = jwt.decode(token, { complete: true }) as any
    const result = await invoke(token, {
      algorithm: 'HS256',
      secret,
    })
    expect(result.header).toBe(
      JSON.stringify({ alg: 'HS256', typ: 'JWT' }, null, 2),
    )
    expect(result.payload).toBe(JSON.stringify(payload, null, 2))
    expect(result.signature).toBe(decoded.signature)
    expect(result.signatureVerified).toBe(true)
  })

  it('should decode a valid JWT token with HS384 algorithm', async () => {
    const token = jwt.sign(payload, secret, { algorithm: 'HS384' })
    const decoded = jwt.decode(token, { complete: true }) as any
    const result = await invoke(token, {
      algorithm: 'HS384',
      secret,
    })
    expect(result.header).toBe(
      JSON.stringify({ alg: 'HS384', typ: 'JWT' }, null, 2),
    )
    expect(result.payload).toBe(JSON.stringify(payload, null, 2))
    expect(result.signature).toBe(decoded.signature)
    expect(result.signatureVerified).toBe(true)
  })

  it('should decode a valid JWT token with HS512 algorithm', async () => {
    const token = jwt.sign(payload, secret, { algorithm: 'HS512' })
    const decoded = jwt.decode(token, { complete: true }) as any
    const result = await invoke(token, {
      algorithm: 'HS512',
      secret,
    })
    expect(result.header).toBe(
      JSON.stringify({ alg: 'HS512', typ: 'JWT' }, null, 2),
    )
    expect(result.payload).toBe(JSON.stringify(payload, null, 2))
    expect(result.signature).toBe(decoded.signature)
    expect(result.signatureVerified).toBe(true)
  })

  it('should throw an error for an invalid JWT token', async () => {
    const token = 'invalid-jwt-token'
    expect(async () => {
      await invoke(token, { algorithm: 'HS256', secret: 'secret' })
    }).toThrowError('Invalid JWT token')
  })
})
