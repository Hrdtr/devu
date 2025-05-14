import { expect, test } from 'bun:test'
import { invoke } from '../index'

test('minifies a valid CSS string', async () => {
  const result = await invoke('body { color: red; }')
  expect(result).toBe('body{color:red}')
})

test('handles CSS with multiple rules', async () => {
  const result = await invoke('body { color: red; } p { font-size: 14px; }')
  expect(result).toBe('body{color:red}p{font-size:14px}')
})

test('handles level 2 optimization', async () => {
  const result = await invoke('body { color: red; } p { font-size: 14px; }', {
    level: { 2: { restructureRules: true } },
  })
  expect(result).toBe('body{color:red}p{font-size:14px}')
})
