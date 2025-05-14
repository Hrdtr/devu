import { expect, test } from 'bun:test'
import { invoke } from '../index'

test('converts a CSV string to a JSON string correctly', async () => {
  const expectedOutput = JSON.stringify(
    JSON.parse(
      '[{"name":"John Doe","age":"30","city":"New York"},{"name":"Jane Doe","age":"25","city":"Los Angeles"}]',
    ),
    null,
    2,
  )
  expect(
    await invoke('name,age,city\nJohn Doe,30,New York\nJane Doe,25,Los Angeles'),
  ).toEqual(expectedOutput)
})

test('converts a CSV string to a JSON string with empty headers', async () => {
  const expectedOutput = JSON.stringify(
    JSON.parse(
      '[{"name":"John Doe","age":"30","city":"New York"},{"name":"Jane Doe","age":"25","city":"Los Angeles"}]',
    ),
    null,
    2,
  )
  expect(
    await invoke(
      'name,age,city\nJohn Doe,30,New York\nJane Doe,25,Los Angeles',
      {
        headers: '',
      },
    ),
  ).toEqual(expectedOutput)
})

test('converts a CSV string to a JSON string with custom delimiter', async () => {
  const expectedOutput = JSON.stringify(
    JSON.parse(
      '[{"name":"John Doe","age":"30","city":"New York"},{"name":"Jane Doe","age":"25","city":"Los Angeles"}]',
    ),
    null,
    2,
  )
  expect(
    await invoke(
      'name;age;city\nJohn Doe;30;New York\nJane Doe;25;Los Angeles',
      { separator: ';' },
    ),
  ).toEqual(expectedOutput)
})
