import { expect, test } from 'bun:test'
import { invoke } from '../index'

test('converts a YAML string to a JSON string correctly', async () => {
  const expectedOutput = JSON.stringify(
    JSON.parse('{"name":"John Doe","age":30,"city":"New York"}'),
    null,
    2,
  )
  expect(await invoke('name: John Doe\nage: 30\ncity: New York\n')).toEqual(
    expectedOutput,
  )
})

test('handles invalid YAML input correctly', async () => {
  expect(
    async () => await invoke('name: John Doe\nage: 30\ncity: New York: extra'),
  ).toThrowError()
})
