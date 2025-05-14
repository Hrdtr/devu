import { expect, test } from 'bun:test'
import { invoke } from '../index'

test('converts a JSON string to a YAML string correctly', async () => {
  const expectedOutput = 'name: John Doe\nage: 30\ncity: New York\n'
  expect(
    await invoke('{"name": "John Doe", "age": 30, "city": "New York"}'),
  ).toEqual(expectedOutput)
})

test('handles invalid JSON input correctly', async () => {
  expect(
    async () =>
      await invoke('{"name": "John Doe", "age": 30, "city": "New York"'),
  ).toThrowError()
})
