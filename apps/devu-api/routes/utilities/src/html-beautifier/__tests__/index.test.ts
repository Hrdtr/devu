import { expect, test } from 'bun:test'
import { invoke } from '../index'

test('formats a valid HTML string with indentSize', async () => {
  const result = await invoke('<p>Hello <b>World</b></p>', { indentSize: 2 })
  expect(result).toBe(`<p>Hello <b>World</b></p>`)
})

test('handles HTML with attributes and indent_char', async () => {
  const result = await invoke('<div class="container"><p>Hello</p></div>', {
    indentSize: 4,
    indentChar: ' ',
  })
  expect(result).toBe(`<div class="container">\n    <p>Hello</p>\n</div>`)
})

test('formats with default indent and preserves newlines', async () => {
  const result = await invoke('<p>Hello <b>World</b></p>')
  expect(result).toBe(`<p>Hello <b>World</b></p>`)
})

test('handles unformatted tags', async () => {
  const result = await invoke('<script>var a = 1;</script><p>Hello</p>', {
    unformatted: ['script'],
  })
  expect(result).toBe(`<script>var a = 1;</script>\n<p>Hello</p>`)
})
