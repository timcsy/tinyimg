import type { RawImage } from './types'

/** 面積平均（box filter）縮放；放大時退化為最近鄰 */
export function boxResize(img: RawImage, width: number, height: number): RawImage {
  const out = new Uint8ClampedArray(width * height * 4)
  const sx = img.width / width
  const sy = img.height / height
  const src = img.data
  for (let y = 0; y < height; y++) {
    const y0 = Math.floor(y * sy)
    const y1 = Math.max(y0 + 1, Math.min(img.height, Math.floor((y + 1) * sy)))
    for (let x = 0; x < width; x++) {
      const x0 = Math.floor(x * sx)
      const x1 = Math.max(x0 + 1, Math.min(img.width, Math.floor((x + 1) * sx)))
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (let yy = y0; yy < y1; yy++) {
        let i = (yy * img.width + x0) * 4
        for (let xx = x0; xx < x1; xx++, i += 4) {
          r += src[i]!
          g += src[i + 1]!
          b += src[i + 2]!
          a += src[i + 3]!
        }
      }
      const n = (y1 - y0) * (x1 - x0)
      const o = (y * width + x) * 4
      out[o] = r / n
      out[o + 1] = g / n
      out[o + 2] = b / n
      out[o + 3] = a / n
    }
  }
  return { width, height, data: out }
}

/** 等比例縮放，使最長邊為 longest（各邊至少 1） */
export function fitLongestEdge(width: number, height: number, longest: number) {
  const s = longest / Math.max(width, height)
  return { width: Math.max(1, Math.round(width * s)), height: Math.max(1, Math.round(height * s)) }
}

/** 下一輪的邊長縮放倍率：依「目前最小大小 / 目標」估計，限制在 0.5 到 0.9 */
export function nextScale(currentBytes: number, targetBytes: number): number {
  const s = Math.sqrt(targetBytes / currentBytes) * 0.95
  return Math.min(0.9, Math.max(0.5, s))
}
