import { expect, test } from 'bun:test'
import { invoke } from '../index'

test('converts a number from base 10 to base 2 correctly', async () => {
  const expectedOutput = '1010'
  expect(await invoke('10', { fromBase: 10, toBase: 2 })).toEqual(
    expectedOutput,
  )
})

test('converts a number from base 16 to base 10 correctly', async () => {
  const expectedOutput = '10'
  expect(await invoke('A', { fromBase: 16, toBase: 10 })).toEqual(
    expectedOutput,
  )
})

test('handles invalid number input correctly', async () => {
  expect(
    async () => await invoke('Z', { fromBase: 10, toBase: 2 }),
  ).toThrowError('Invalid number for the given base.')
})
