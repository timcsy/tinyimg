import type { RawImage } from './types'

/** 均勻取樣最多 maxPixels 個像素，回傳扁平的 RGBA 陣列 */
export function samplePixels(img: RawImage, maxPixels: number): Uint8ClampedArray {
  const total = img.width * img.height
  if (total <= maxPixels) return img.data
  const step = total / maxPixels
  const out = new Uint8ClampedArray(Math.floor(maxPixels) * 4)
  let o = 0
  for (let k = 0; k < maxPixels && o < out.length; k++) {
    const i = Math.floor(k * step) * 4
    out[o++] = img.data[i]!
    out[o++] = img.data[i + 1]!
    out[o++] = img.data[i + 2]!
    out[o++] = img.data[i + 3]!
  }
  return out
}

/**
 * 把每個像素映射到調色盤中最接近的顏色。
 * 用 5-bit RGB + 4-bit alpha 的查表快取，每個色格只做一次最近色搜尋。
 */
export function mapToPalette(img: RawImage, palette: Uint8ClampedArray): RawImage {
  const n = palette.length / 4
  const lut = new Int16Array(1 << 19).fill(-1)
  const src = img.data
  const out = new Uint8ClampedArray(src.length)
  for (let i = 0; i < src.length; i += 4) {
    const r = src[i]!
    const g = src[i + 1]!
    const b = src[i + 2]!
    const a = src[i + 3]!
    const key = ((r >> 3) << 14) | ((g >> 3) << 9) | ((b >> 3) << 4) | (a >> 4)
    let idx = lut[key]!
    if (idx < 0) {
      let best = Infinity
      idx = 0
      for (let p = 0; p < n; p++) {
        const o = p * 4
        const dr = r - palette[o]!
        const dg = g - palette[o + 1]!
        const db = b - palette[o + 2]!
        const da = a - palette[o + 3]!
        const d = dr * dr * 3 + dg * dg * 4 + db * db * 2 + da * da * 4
        if (d < best) {
          best = d
          idx = p
          if (d === 0) break
        }
      }
      lut[key] = idx
    }
    const o = idx * 4
    out[i] = palette[o]!
    out[i + 1] = palette[o + 1]!
    out[i + 2] = palette[o + 2]!
    out[i + 3] = palette[o + 3]!
  }
  return { width: img.width, height: img.height, data: out }
}

/** 色彩量化：在取樣上用 Wu 演算法建調色盤，再以查表映射全圖 */
export async function quantize(img: RawImage, colors: number): Promise<RawImage> {
  const iq = await import('image-q')
  const sample = samplePixels(img, 65_536)
  const pc = iq.utils.PointContainer.fromUint8Array(sample, sample.length / 4, 1)
  const pal = iq.buildPaletteSync([pc], { colors, paletteQuantization: 'wuquant' })
  const points = pal.getPointContainer().getPointArray()
  const palette = new Uint8ClampedArray(points.length * 4)
  points.forEach((p, k) => palette.set([p.r, p.g, p.b, p.a], k * 4))
  return mapToPalette(img, palette)
}
