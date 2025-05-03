import { expect, test } from 'bun:test'
import { invoke } from '../index'

test('sorts lines in ascending order', async () => {
  const result = await invoke('c\nb\na', { order: 'asc' })
  expect(result).toBe('a\nb\nc')
})

test('sorts lines in descending order', async () => {
  const result = await invoke('c\nb\na', { order: 'desc' })
  expect(result).toBe('c\nb\na')
})

test('deduplicates lines and sorts in descending order', async () => {
  const result = await invoke('a\nb\na', {
    deduplicate: true,
    order: 'desc',
  })
  expect(result).toBe('b\na')
})

test('deduplicates lines', async () => {
  const result = await invoke('a\nb\na', { deduplicate: true })
  expect(result).toBe('a\nb')
})

test('sorts lines case-insensitively', async () => {
  const result = await invoke('B\na\nb', { caseInsensitive: true })
  expect(result).toBe('a\nB\nb')
})
