import { expect, test } from 'bun:test'
import { invoke } from '../index'

test('formats a valid JavaScript string with indentSize', async () => {
  const result = await invoke('function hello() { console.log("hello"); }', {
    indentSize: 2,
  })
  expect(result).toBe('function hello() {\n  console.log("hello");\n}')
})

test('handles JavaScript with multiple statements', async () => {
  const result = await invoke('var a = 1; var b = 2;', {
    indentSize: 4,
  })
  expect(result).toBe('var a = 1;\nvar b = 2;')
})

test('formats with default indent', async () => {
  const result = await invoke('function hello() { console.log("hello"); }')
  expect(result).toBe('function hello() {\n  console.log("hello");\n}')
})

test('handles brace_style', async () => {
  const result = await invoke('function hello() { console.log("hello"); }', {
    braceStyle: 'expand',
    indentSize: 2,
  })
  expect(result).toBe('function hello()\n{\n  console.log("hello");\n}')
})
