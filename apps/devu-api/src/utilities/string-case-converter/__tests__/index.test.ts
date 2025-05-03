import { expect, test } from 'bun:test'
import { invoke } from '../index'

test('converts to camelCase', async () => {
  const result = await invoke('foo-bar_baz', { targetCase: 'camel' })
  expect(result).toBe('fooBarBaz')
})

test('converts to pascalCase', async () => {
  const result = await invoke('foo-bar_baz', { targetCase: 'pascal' })
  expect(result).toBe('FooBarBaz')
})

test('converts to snake_case', async () => {
  const result = await invoke('foo-barBaz', { targetCase: 'snake' })
  expect(result).toBe('foo_bar_baz')
})

test('converts to kebab-case', async () => {
  const result = await invoke('fooBar_Baz', { targetCase: 'kebab' })
  expect(result).toBe('foo-bar-baz')
})

test('converts to flatCase', async () => {
  const result = await invoke('foo-barBaz', { targetCase: 'flat' })
  expect(result).toBe('foobarbaz')
})

test('converts to trainCase', async () => {
  const result = await invoke('FooBARb', { targetCase: 'train' })
  expect(result).toBe('Foo-BA-Rb')
})

test('converts to titleCase', async () => {
  const result = await invoke('this-IS-aTitle', { targetCase: 'title' })
  expect(result).toBe('This is a Title')
})

test('converts to upperFirst', async () => {
  const result = await invoke('hello world', { targetCase: 'upperFirst' })
  expect(result).toBe('Hello world')
})

test('converts to lowerFirst', async () => {
  const result = await invoke('Hello World', { targetCase: 'lowerFirst' })
  expect(result).toBe('hello World')
})
