import { describe, expect, it } from 'bun:test'
import { invoke } from '../index'

describe('color-converter', () => {
  it('should convert a hex color to rgb', async () => {
    const result = await invoke('#ffffff', { from: 'hex', to: 'rgb' })
    expect(result).toBe(`rgb(255, 255, 255)`)
  })

  it('should convert a rgb color to hex', async () => {
    const result = await invoke('rgb(255, 255, 255)', {
      from: 'rgb',
      to: 'hex',
    })
    expect(result).toBe('#FFFFFF')
  })

  it('should convert a rgba color to hex', async () => {
    const result = await invoke('rgba(255, 255, 255, 1)', {
      from: 'rgba',
      to: 'hex',
    })
    expect(result).toBe('#FFFFFF')
  })

  it('should convert a hsl color to hex', async () => {
    const result = await invoke('hsl(0, 0, 100)', { from: 'hsl', to: 'hex' })
    expect(result).toBe('#FFFFFF')
  })

  it('should convert a hsla color to hex', async () => {
    const result = await invoke('hsla(0, 0, 100, 1)', {
      from: 'hsla',
      to: 'hex',
    })
    expect(result).toBe('#FFFFFF')
  })

  it('should convert a cmyk color to hex', async () => {
    const result = await invoke('cmyk(0, 0, 0, 0)', {
      from: 'cmyk',
      to: 'hex',
    })
    expect(result).toBe('#FFFFFF')
  })

  it('should convert a hwb color to hex', async () => {
    const result = await invoke('hwb(0, 100, 0)', { from: 'hwb', to: 'hex' })
    expect(result).toBe('#FFFFFF')
  })

  it('should convert a hex color to rgba', async () => {
    const result = await invoke('#ffffff', { from: 'hex', to: 'rgba' })
    expect(result).toBe(`rgba(255, 255, 255, 1)`)
  })

  it('should convert a rgb color to rgba', async () => {
    const result = await invoke('rgb(255, 255, 255)', {
      from: 'rgb',
      to: 'rgba',
    })
    expect(result).toBe(`rgba(255, 255, 255, 1)`)
  })

  it('should convert a rgba color to rgba', async () => {
    const result = await invoke('rgba(255, 255, 255, 1)', {
      from: 'rgba',
      to: 'rgba',
    })
    expect(result).toBe(`rgba(255, 255, 255, 1)`)
  })

  it('should convert a hsl color to rgba', async () => {
    const result = await invoke('hsl(0, 0, 100)', { from: 'hsl', to: 'rgba' })
    expect(result).toBe(`rgba(255, 255, 255, 1)`)
  })

  it('should convert a hsla color to rgba', async () => {
    const result = await invoke('hsla(0, 0, 100, 1)', {
      from: 'hsla',
      to: 'rgba',
    })
    expect(result).toBe(`rgba(255, 255, 255, 1)`)
  })

  it('should convert a cmyk color to rgba', async () => {
    const result = await invoke('cmyk(0, 0, 0, 0)', {
      from: 'cmyk',
      to: 'rgba',
    })
    expect(result).toBe(`rgba(255, 255, 255, 1)`)
  })

  it('should convert a hwb color to rgba', async () => {
    const result = await invoke('hwb(0, 100, 0)', { from: 'hwb', to: 'rgba' })
    expect(result).toBe(`rgba(255, 255, 255, 1)`)
  })

  it('should throw an error for an invalid hex color', async () => {
    expect(
      async () => await invoke('invalid-hex-color', { from: 'hex', to: 'rgb' }),
    ).toThrowError()
  })

  it('should throw an error for an invalid rgb color', async () => {
    expect(
      async () => await invoke('invalid-rgb-color', { from: 'rgb', to: 'hex' }),
    ).toThrowError()
  })
})
