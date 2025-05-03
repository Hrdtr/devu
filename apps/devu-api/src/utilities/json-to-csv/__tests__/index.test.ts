import { expect, test } from 'bun:test'
import { invoke } from '../index'

test('converts a JSON string to a CSV string correctly', async () => {
  const expectedOutput
    = '"name","age","city"\n"John Doe",30,"New York"\n"Jane Doe",25,"Los Angeles"'
  expect(
    await invoke(
      '[{"name": "John Doe", "age": 30, "city": "New York"}, {"name": "Jane Doe", "age": 25, "city": "Los Angeles"}]',
    ),
  ).toEqual(expectedOutput)
})

test('handles invalid JSON input correctly', async () => {
  expect(
    async () =>
      await invoke(
        '[{"name": "John Doe", "age": 30, "city": "New York"}, {"name": "Jane Doe", "age": 25, "city": "Los Angeles"',
      ),
  ).toThrowError()
})

test('converts a JSON string to a CSV string with custom delimiter', async () => {
  const expectedOutput
    = '"name";"age";"city"\n"John Doe";30;"New York"\n"Jane Doe";25;"Los Angeles"'
  expect(
    await invoke(
      '[{"name": "John Doe", "age": 30, "city": "New York"}, {"name": "Jane Doe", "age": 25, "city": "Los Angeles"}]',
      { delimiter: ';' },
    ),
  ).toEqual(expectedOutput)
})
