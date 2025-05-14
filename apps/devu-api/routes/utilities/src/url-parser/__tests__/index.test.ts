import { expect, test } from 'bun:test'
import { invoke } from '../index'

test('parses a URL correctly', async () => {
  const expectedOutput = {
    protocol: 'https:',
    hostname: 'example.com',
    port: '8080',
    pathname: '/path/to/resource',
    search: '?query=value',
    hash: '#fragment',
    origin: 'https://example.com:8080',
  }
  expect(
    await invoke(
      'https://example.com:8080/path/to/resource?query=value#fragment',
    ),
  ).toEqual(expectedOutput)
})

test('parses a URL with no port correctly', async () => {
  const expectedOutput = {
    protocol: 'https:',
    hostname: 'example.com',
    port: '',
    pathname: '/path/to/resource',
    search: '?query=value',
    hash: '#fragment',
    origin: 'https://example.com',
  }
  expect(
    await invoke('https://example.com/path/to/resource?query=value#fragment'),
  ).toEqual(expectedOutput)
})

test('parses a URL with no path correctly', async () => {
  const expectedOutput = {
    protocol: 'https:',
    hostname: 'example.com',
    port: '',
    pathname: '/',
    search: '',
    hash: '',
    origin: 'https://example.com',
  }
  expect(await invoke('https://example.com')).toEqual(expectedOutput)
})
