import type { RawImage } from './types'

export function hasAlpha(img: RawImage): boolean {
  const d = img.data
  for (let i = 3; i < d.length; i += 4) if (d[i]! < 255) return true
  return false
}

/** 把透明區域鋪上背景色（預設白色），回傳新的不透明影像 */
export function flattenAlpha(
  img: RawImage,
  background: [number, number, number] = [255, 255, 255],
): RawImage {
  const src = img.data
  const out = new Uint8ClampedArray(src.length)
  const [br, bg, bb] = background
  for (let i = 0; i < src.length; i += 4) {
    const a = src[i + 3]! / 255
    out[i] = src[i]! * a + br * (1 - a)
    out[i + 1] = src[i + 1]! * a + bg * (1 - a)
    out[i + 2] = src[i + 2]! * a + bb * (1 - a)
    out[i + 3] = 255
  }
  return { width: img.width, height: img.height, data: out }
}

/** 依 GIF 區塊結構計算影格數；超過 1 幀視為動畫。格式不符或截斷時回傳 false */
export function isAnimatedGif(bytes: Uint8Array): boolean {
  const b = bytes
  if (b.length < 13 || b[0] !== 0x47 || b[1] !== 0x49 || b[2] !== 0x46) return false
  let p = 13
  const packed = b[10]!
  if (packed & 0x80) p += 3 * (1 << ((packed & 0x07) + 1))
  let frames = 0
  const skipSubBlocks = (): boolean => {
    while (p < b.length) {
      const len = b[p]!
      p += 1
      if (len === 0) return true
      p += len
    }
    return false
  }
  while (p < b.length) {
    const tag = b[p]!
    if (tag === 0x3b) break
    if (tag === 0x21) {
      p += 2
      if (!skipSubBlocks()) return false
    } else if (tag === 0x2c) {
      if (p + 10 > b.length) return false
      const lp = b[p + 9]!
      p += 10
      if (lp & 0x80) p += 3 * (1 << ((lp & 0x07) + 1))
      p += 1 // LZW 最小碼長
      if (!skipSubBlocks()) return false
      frames += 1
      if (frames > 1) return true
    } else {
      return false
    }
  }
  return false
}
