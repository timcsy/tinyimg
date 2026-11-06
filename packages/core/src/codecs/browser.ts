import { renderAnnotations, type Annotation } from '../annotations'
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

/** 解碼時保留的完整 ImageBitmap，供預覽直接縮小使用（bitmap → bitmap 最快）；release 時關閉 */
const decodedBitmaps = new WeakMap<RawImage, ImageBitmap>()

async function decodeImpl(bytes: Uint8Array, mimeType: string, keep: boolean): Promise<RawImage> {
  const bitmap = await createImageBitmap(new Blob([bytes as BlobPart], { type: mimeType }))
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    bitmap.close()
    throw new Error('OffscreenCanvas 2d 不可用')
  }
  ctx.drawImage(bitmap, 0, 0)
  const data = ctx.getImageData(0, 0, bitmap.width, bitmap.height)
  const img: RawImage = { width: data.width, height: data.height, data: data.data }
  if (keep) decodedBitmaps.set(img, bitmap)
  else bitmap.close()
  return img
}

// 不保留解碼後的 bitmap：實測從它縮小產生預覽在 Firefox 上反而更慢（research 002 R8），保留只會多佔記憶體
export const decode = (bytes: Uint8Array, mimeType: string) => decodeImpl(bytes, mimeType, false)

export function release(img: RawImage): void {
  decodedBitmaps.get(img)?.close()
  decodedBitmaps.delete(img)
}

export async function toPng(bytes: Uint8Array, mimeType: string): Promise<Uint8Array> {
  if (mimeType === 'image/png') return bytes
  const img = await decodeImpl(bytes, mimeType, false)
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

/** 預覽：縮小到最長邊 2048 的 ImageBitmap（可轉移給主執行緒） */
export async function preview(img: RawImage): Promise<ImageBitmap> {
  const scale = Math.min(1, 2048 / Math.max(img.width, img.height))
  const opts: ImageBitmapOptions = {
    resizeWidth: Math.max(1, Math.round(img.width * scale)),
    resizeHeight: Math.max(1, Math.round(img.height * scale)),
    resizeQuality: 'high',
  }
  const source = decodedBitmaps.get(img)
  if (source) return createImageBitmap(source, opts)
  return createImageBitmap(
    new ImageData(new Uint8ClampedArray(img.data), img.width, img.height),
    opts,
  )
}

/** 把向量註解畫到影像上（與預覽共用 renderAnnotations，research 003 R3） */
export async function drawVectors(img: RawImage, vectors: Annotation[]): Promise<RawImage> {
  const canvas = toCanvas(img)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('OffscreenCanvas 2d 不可用')
  renderAnnotations(ctx, vectors)
  const data = ctx.getImageData(0, 0, img.width, img.height)
  return { width: img.width, height: img.height, data: data.data }
}
