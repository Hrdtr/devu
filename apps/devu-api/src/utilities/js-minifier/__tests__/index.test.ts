import { expect, test } from 'bun:test'
import { invoke } from '../index'

test('minifies a valid JavaScript string', async () => {
  const result = await invoke('function hello() { console.log("hello"); }')
  expect(result).toBe('function hello(){console.log("hello")}')
})

test('handles JavaScript with multiple statements', async () => {
  const result = await invoke('var a = 1; var b = 2;')
  expect(result).toBe('var a=1,b=2;')
})

test('handles mangle option', async () => {
  const result = await invoke('function hello(a) { console.log(a); }', {
    mangle: false,
  })
  expect(result).toBe('function hello(a){console.log(a)}')
})

test('handles compress option', async () => {
  const result = await invoke('function hello() { var a = 1; return a; }', {
    compress: false,
  })
  expect(result).toBe('function hello(){var n=1;return n}')
})
