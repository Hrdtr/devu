import type { Input, Options, Output } from './definition'
import colorConvert from 'color-convert'
import { schema } from './definition'

export * from './definition'

type ColorArray = [number, number, number, number | undefined]

function parseColorArray(
  color: string,
  prefix: string,
  expectedLength: number,
): ColorArray {
  const values = color.slice(prefix.length, -1).split(',').map(Number)
  if (values.length !== expectedLength || values.some(Number.isNaN)) {
    throw new Error(`Invalid ${prefix.toUpperCase()} color format`)
  }
  return values as ColorArray
}

function validateHex(color: string) {
  if (!/^#?[0-9A-F]{6}$/i.test(color)) {
    throw new Error('Invalid HEX color format')
  }
}

function toCssFunc(name: string, values: (number | string)[]): string {
  if (['hsl', 'hsla'].includes(name)) {
    const [h, s, l, a] = values
    return a !== undefined
      ? `hsla(${h}, ${s}%, ${l}%, ${a})`
      : `hsl(${h}, ${s}%, ${l}%)`
  }
  if (['hwb'].includes(name)) {
    const [h, w, b, a] = values
    return a !== undefined
      ? `hwb(${h}, ${w}%, ${b}%, ${a})`
      : `hwb(${h}, ${w}%, ${b}%)`
  }
  if (['cmyk'].includes(name)) {
    const [c, m, y, k] = values
    return `cmyk(${c}%, ${m}%, ${y}%, ${k}%)`
  }
  return `${name}(${values.join(', ')})` // default for rgb, rgba
}

const converters = {
  hex: (color: string) => {
    validateHex(color)
    return {
      rgb: () => colorConvert.hex.rgb(color),
      rgba: () => [...colorConvert.hex.rgb(color), 1],
      hsl: () => colorConvert.hex.hsl(color),
      hsla: () => [...colorConvert.hex.hsl(color), 1],
      cmyk: () => colorConvert.hex.cmyk(color),
      hwb: () => colorConvert.hex.hwb(color),
      hex: () => color.replace(/^#/, '').toUpperCase(),
    }
  },
  rgb: (color: string) => {
    const [r, g, b] = parseColorArray(color, 'rgb(', 3)
    return {
      hex: () => colorConvert.rgb.hex([r, g, b]),
      hsl: () => colorConvert.rgb.hsl([r, g, b]),
      cmyk: () => colorConvert.rgb.cmyk([r, g, b]),
      rgba: () => [r, g, b, 1],
      hsla: () => [...colorConvert.rgb.hsl([r, g, b]), 1],
      hwb: () => colorConvert.rgb.hwb([r, g, b]),
      rgb: () => [r, g, b],
    }
  },
  rgba: (color: string) => {
    const [r, g, b, a] = parseColorArray(color, 'rgba(', 4)
    return {
      hex: () => colorConvert.rgb.hex([r, g, b]),
      hsl: () => colorConvert.rgb.hsl([r, g, b]),
      cmyk: () => colorConvert.rgb.cmyk([r, g, b]),
      rgb: () => [r, g, b],
      rgba: () => [r, g, b, a],
      hsla: () => [...colorConvert.rgb.hsl([r, g, b]), a],
      hwb: () => colorConvert.rgb.hwb([r, g, b]),
    }
  },
  hsl: (color: string) => {
    const [h, s, l] = parseColorArray(color, 'hsl(', 3)
    return {
      hex: () => colorConvert.hsl.hex([h, s, l]),
      rgb: () => colorConvert.hsl.rgb([h, s, l]),
      cmyk: () => colorConvert.hsl.cmyk([h, s, l]),
      rgba: () => [...colorConvert.hsl.rgb([h, s, l]), 1],
      hsla: () => [h, s, l, 1],
      hwb: () => colorConvert.hsl.hwb([h, s, l]),
      hsl: () => [h, s, l],
    }
  },
  hsla: (color: string) => {
    const [h, s, l, a] = parseColorArray(color, 'hsla(', 4)
    return {
      hex: () => colorConvert.hsl.hex([h, s, l]),
      rgb: () => colorConvert.hsl.rgb([h, s, l]),
      cmyk: () => colorConvert.hsl.cmyk([h, s, l]),
      rgba: () => [...colorConvert.hsl.rgb([h, s, l]), a],
      hsla: () => [h, s, l, a],
      hwb: () => colorConvert.hsl.hwb([h, s, l]),
    }
  },
  cmyk: (color: string) => {
    const [c, m, y, k] = parseColorArray(color, 'cmyk(', 4)
    return {
      hex: () => colorConvert.cmyk.hex([c, m, y, k!]),
      rgb: () => colorConvert.cmyk.rgb([c, m, y, k!]),
      hsl: () => colorConvert.cmyk.hsl([c, m, y, k!]),
      rgba: () => [...colorConvert.cmyk.rgb([c, m, y, k!]), 1],
      hsla: () => [...colorConvert.cmyk.hsl([c, m, y, k!]), 1],
      hwb: () => colorConvert.cmyk.hwb([c, m, y, k!]),
      cmyk: () => [c, m, y, k],
    }
  },
  hwb: (color: string) => {
    const [h, w, b] = parseColorArray(color, 'hwb(', 3)
    return {
      hex: () => colorConvert.hwb.hex([h, w, b]),
      rgb: () => colorConvert.hwb.rgb([h, w, b]),
      hsl: () => colorConvert.hwb.hsl([h, w, b]),
      rgba: () => [...colorConvert.hwb.rgb([h, w, b]), 1],
      hsla: () => [...colorConvert.hwb.hsl([h, w, b]), 1],
      cmyk: () => colorConvert.hwb.cmyk([h, w, b]),
      hwb: () => [h, w, b],
    }
  },
} as const

export async function invoke(input: Input, options: Options): Promise<Output> {
  const { from, to } = schema.options.parse(options)
  const color = schema.input.parse(input)

  try {
    const converter = converters[from as keyof typeof converters]
    if (!converter) {
      throw new Error(`Unsupported 'from' color format: ${from}`)
    }

    const transform
      = converter(color)[to as keyof ReturnType<typeof converter>]
    if (!transform) {
      throw new Error(`Unsupported conversion from '${from}' to '${to}'`)
    }

    const result = transform()

    if (to === 'hex') {
      return schema.output.parse(`#${result}`)
    }
    if (['rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'cmyk'].includes(to)) {
      return schema.output.parse(toCssFunc(to, result as any))
    }

    return schema.output.parse(result)
  }
  catch (error: any) {
    throw new Error(`Failed to convert color: ${error.message}`)
  }
}

export const colorConverter = invoke
