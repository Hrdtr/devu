import { expect, test } from 'bun:test'
import { invoke } from '../index'

test('formats a valid CSS string with indentSize', async () => {
  const result = await invoke('body { color: red; }', {
    indentSize: 2,
  })
  expect(result).toBe('body {\n  color: red;\n}')
})

test('handles CSS with multiple rules and selector_separator_newline', async () => {
  const result = await invoke('body { color: red; } p { font-size: 14px; }', {
    indentSize: 4,
    selectorSeparatorNewline: true,
  })
  expect(result).toBe(
    'body {\n    color: red;\n}\n\np {\n    font-size: 14px;\n}',
  )
})

test('formats with default indent and preserves newlines', async () => {
  const result = await invoke('body { color: red; }')
  expect(result).toBe('body {\n  color: red;\n}')
})

test('handles end_with_newline', async () => {
  const result = await invoke('body { color: red; }', {
    endWithNewline: true,
    indentSize: 2,
  })
  expect(result).toBe('body {\n  color: red;\n}\n')
})
