import type { Codecs, RawImage } from '../types'
import { encodeJpeg, encodePng, encodeWebp } from './wasm'

/** 瀏覽器（Worker）專用：原生 OffscreenCanvas 優先，不支援的格式改用 WASM */

function toCanvas(img: RawImage): OffscreenCanvas {
  const canvas = new OffscreenCanvas(img.width, img.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('OffscreenCanvas 2d 不可用')
  ctx.putImageData(new ImageData(new Uint8ClampedArray(img.data), img.width, img.height), 0, 0)
  return canvas
}

const nativeSupport = new Map<string, boolean>()

async function nativeEncode(
  img: RawImage,
  mime: string,
  quality: number,
): Promise<Uint8Array | null> {
  if (nativeSupport.get(mime) === false) return null
  try {
    const blob = await toCanvas(img).convertToBlob({ type: mime, quality })
    const ok = blob.type === mime
    nativeSupport.set(mime, ok)
    return ok ? new Uint8Array(await blob.arrayBuffer()) : null
  } catch {
    nativeSupport.set(mime, false)
    return null
  }
}

export async function decode(bytes: Uint8Array, mimeType: string): Promise<RawImage> {
  const bitmap = await createImageBitmap(new Blob([bytes as BlobPart], { type: mimeType }))
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('OffscreenCanvas 2d 不可用')
    ctx.drawImage(bitmap, 0, 0)
    const data = ctx.getImageData(0, 0, bitmap.width, bitmap.height)
    return { width: data.width, height: data.height, data: data.data }
  } finally {
    bitmap.close()
  }
}

export async function toPng(bytes: Uint8Array, mimeType: string): Promise<Uint8Array> {
  if (mimeType === 'image/png') return bytes
  const img = await decode(bytes, mimeType)
  const blob = await toCanvas(img).convertToBlob({ type: 'image/png' })
  return new Uint8Array(await blob.arrayBuffer())
}

export const browserCodecs: Codecs = {
  async encode(img, format, quality) {
    const mime = format === 'jpeg' ? 'image/jpeg' : 'image/webp'
    const native = await nativeEncode(img, mime, quality)
    if (native) return native
    return format === 'jpeg' ? encodeJpeg(img, quality) : encodeWebp(img, quality)
  },
  encodePng,
  async resize(img, width, height) {
    const src = toCanvas(img)
    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('OffscreenCanvas 2d 不可用')
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(src, 0, 0, width, height)
    const data = ctx.getImageData(0, 0, width, height)
    return { width, height, data: data.data }
  },
}
