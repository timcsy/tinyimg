import { boxResize } from './resize'
import type { RawImage } from './types'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}
export interface Size {
  width: number
  height: number
}
export interface Point {
  x: number
  y: number
}

/**
 * 標準化的編輯狀態：在原圖上裁切 → D4 變換（順時針旋轉 rotation 次，之後可水平翻轉）→ 縮放到 output。
 * 90° 旋轉、翻轉、整數裁切都是像素精確的，只有最後的縮放會重新取樣。
 */
export interface EditState {
  crop: Rect
  rotation: 0 | 1 | 2 | 3
  flipX: boolean
  output: Size
}

export function identityEdit(source: Size): EditState {
  return {
    crop: { x: 0, y: 0, width: source.width, height: source.height },
    rotation: 0,
    flipX: false,
    output: { width: source.width, height: source.height },
  }
}

/** 裁切並旋轉後、縮放前的尺寸 */
export function orientedSize(s: EditState): Size {
  const odd = s.rotation % 2 === 1
  return odd
    ? { width: s.crop.height, height: s.crop.width }
    : { width: s.crop.width, height: s.crop.height }
}

/**
 * 把「縮放前畫面」的連續座標映回裁切區內的連續座標（未加上 crop 原點）。
 * 先撤銷翻轉，再撤銷旋轉。
 */
export function unorient(s: EditState, p: Point): Point {
  const o = orientedSize(s)
  const w = s.crop.width
  const h = s.crop.height
  const X = s.flipX ? o.width - p.x : p.x
  const Y = p.y
  switch (s.rotation) {
    case 0:
      return { x: X, y: Y }
    case 1:
      return { x: Y, y: h - X }
    case 2:
      return { x: w - X, y: h - Y }
    default:
      return { x: w - Y, y: X }
  }
}

/** 輸出座標（連續）→ 原圖座標（連續） */
export function mapPoint(s: EditState, p: Point): Point {
  const o = orientedSize(s)
  const q = unorient(s, {
    x: (p.x * o.width) / s.output.width,
    y: (p.y * o.height) / s.output.height,
  })
  return { x: q.x + s.crop.x, y: q.y + s.crop.y }
}

/** 依 EditState 產生新影像（不修改輸入） */
export async function applyEdit(
  img: RawImage,
  s: EditState,
  resize?: (img: RawImage, width: number, height: number) => Promise<RawImage>,
): Promise<RawImage> {
  const o = orientedSize(s)
  const out = new Uint8ClampedArray(o.width * o.height * 4)
  const src = img.data
  const { x: cx, y: cy } = s.crop
  for (let Y = 0; Y < o.height; Y++) {
    for (let X = 0; X < o.width; X++) {
      // 以像素中心映射，再取整數，確保像素精確
      const q = unorient(s, { x: X + 0.5, y: Y + 0.5 })
      const sx = cx + Math.floor(q.x)
      const sy = cy + Math.floor(q.y)
      const si = (sy * img.width + sx) * 4
      const di = (Y * o.width + X) * 4
      out[di] = src[si]!
      out[di + 1] = src[si + 1]!
      out[di + 2] = src[si + 2]!
      out[di + 3] = src[si + 3]!
    }
  }
  const oriented: RawImage = { width: o.width, height: o.height, data: out }
  if (s.output.width === o.width && s.output.height === o.height) return oriented
  return resize
    ? resize(oriented, s.output.width, s.output.height)
    : boxResize(oriented, s.output.width, s.output.height)
}

/**
 * 原圖座標 → 輸出座標的仿射矩陣 [a, b, c, d, e, f]（與 Canvas2D setTransform 相同的參數順序）。
 * mapPoint 是仿射的，取三個點求出它的矩陣，再求反矩陣。
 */
export function sourceToOutputMatrix(
  s: EditState,
): [number, number, number, number, number, number] {
  const o = mapPoint(s, { x: 0, y: 0 })
  const px = mapPoint(s, { x: 1, y: 0 })
  const py = mapPoint(s, { x: 0, y: 1 })
  // 正向（輸出 → 原圖）：src = M·out + o
  const m11 = px.x - o.x
  const m21 = px.y - o.y
  const m12 = py.x - o.x
  const m22 = py.y - o.y
  const det = m11 * m22 - m12 * m21
  const i11 = m22 / det
  const i12 = -m12 / det
  const i21 = -m21 / det
  const i22 = m11 / det
  return [i11, i21, i12, i22, -(i11 * o.x + i12 * o.y), -(i21 * o.x + i22 * o.y)]
}
