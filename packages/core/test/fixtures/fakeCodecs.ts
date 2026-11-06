import type { Codecs, RawImage } from '../../src/types'

export interface FakeCall {
  kind: 'encode' | 'encodePng' | 'resize'
  format?: string
  quality?: number
  colors?: number | null
  width: number
  height: number
}

/**
 * 可控制大小曲線的假編碼器。
 * 預設：大小 = 像素數 × bytesPerPixel(quality 或 colors)。
 * 輸出的位元組內容不重要，只有長度有意義。
 */
export function fakeCodecs(opts: {
  lossyBpp?: (quality: number) => number
  pngBpp?: (colors: number | null) => number
  withResize?: boolean
}): Codecs & { calls: FakeCall[] } {
  const calls: FakeCall[] = []
  const lossyBpp = opts.lossyBpp ?? ((q) => 0.2 + q * 1.8)
  const pngBpp = opts.pngBpp ?? ((c) => (c === null ? 3 : 0.5 + c / 256))
  const size = (img: RawImage, bpp: number) => Math.max(1, Math.round(img.width * img.height * bpp))
  const codecs: Codecs & { calls: FakeCall[] } = {
    calls,
    async encode(img, format, quality) {
      calls.push({ kind: 'encode', format, quality, width: img.width, height: img.height })
      return new Uint8Array(size(img, lossyBpp(quality)))
    },
    async encodePng(img, colors) {
      calls.push({ kind: 'encodePng', colors, width: img.width, height: img.height })
      return new Uint8Array(size(img, pngBpp(colors)))
    },
  }
  if (opts.withResize) {
    codecs.resize = async (img, width, height) => {
      calls.push({ kind: 'resize', width, height })
      return { width, height, data: new Uint8ClampedArray(width * height * 4) }
    }
  }
  return codecs
}
