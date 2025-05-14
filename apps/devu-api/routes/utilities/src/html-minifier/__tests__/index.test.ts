import { expect, test } from 'bun:test'
import { invoke } from '../index'

test('minifies a valid HTML string', async () => {
  const result = await invoke('<p>Hello <b>World</b></p>')
  expect(result).toBe('<p>Hello <b>World</b></p>')
})

test('handles HTML with attributes', async () => {
  const result = await invoke('<div class="container"><p>Hello</p></div>', {
    removeComments: false,
  })
  expect(result).toBe('<div class="container"><p>Hello</p></div>')
})

test('handles HTML with comments', async () => {
  const result = await invoke('<!-- comment --><p>Hello</p>', {
    removeComments: true,
  })
  expect(result).toBe('<p>Hello</p>')
})

test('preserves comments when removeComments is false', async () => {
  const result = await invoke('<!-- comment --><p>Hello</p>', {
    removeComments: false,
  })
  expect(result).toBe('<!-- comment --><p>Hello</p>')
})
