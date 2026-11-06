import { quantize } from '../quantize'
import type { Codecs, RawImage } from '../types'

/**
 * WASM 編碼器（jSquash、image-q），全部延遲載入。
 * jSquash 以 `instanceof ImageData` 判斷輸入，所以一律轉成 ImageData。
 */
const toImageData = (img: RawImage): ImageData =>
  new ImageData(new Uint8ClampedArray(img.data), img.width, img.height)

export async function encodeJpeg(img: RawImage, quality: number): Promise<Uint8Array> {
  const { default: encode } = await import('@jsquash/jpeg/encode.js')
  return new Uint8Array(await encode(toImageData(img), { quality: Math.round(quality * 100) }))
}

export async function encodeWebp(img: RawImage, quality: number): Promise<Uint8Array> {
  const { default: encode } = await import('@jsquash/webp/encode.js')
  return new Uint8Array(await encode(toImageData(img), { quality: Math.round(quality * 100) }))
}

/** PNG：可選的量化 + oxipng 最佳化（≤ 256 色時 oxipng 會自動轉成調色盤 PNG） */
export async function encodePng(img: RawImage, colors: number | null): Promise<Uint8Array> {
  const { default: optimise } = await import('@jsquash/oxipng/optimise.js')
  const src = colors === null ? img : await quantize(img, colors)
  return new Uint8Array(await optimise(toImageData(src), { level: 2 }))
}

export const wasmCodecs: Codecs = {
  encode: (img, format, quality) =>
    format === 'jpeg' ? encodeJpeg(img, quality) : encodeWebp(img, quality),
  encodePng,
}
