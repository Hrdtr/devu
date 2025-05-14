import { expect, test } from 'bun:test'
import { invoke } from '../index'

test('formats a valid JSON string', async () => {
  const result = await invoke('{"name":"John", "age":30}', { indent: 2 })
  expect(result).toBe(`{\n  "name": "John",\n  "age": 30\n}`)
})

test('handles invalid JSON string', async () => {
  expect(
    async () => await invoke('{"name":"John", "age":30', { indent: 2 }),
  ).toThrowError()
})

test('formats with default indent', async () => {
  const result = await invoke('{"name":"John", "age":30}')
  expect(result).toBe(`{\n  "name": "John",\n  "age": 30\n}`)
})
