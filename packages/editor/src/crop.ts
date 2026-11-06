import type { Size } from '@tinyimg/core'

export interface Box {
  x: number
  y: number
  width: number
  height: number
}
export type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'move'
export type RatioOption = 'free' | 'original' | '1:1' | '4:3' | '3:2' | '16:9'
export const RATIOS: RatioOption[] = ['free', 'original', '1:1', '4:3', '3:2', '16:9']

export function ratioValue(opt: RatioOption, bounds: Size): number | null {
  if (opt === 'free') return null
  if (opt === 'original') return bounds.width / bounds.height
  const [a, b] = opt.split(':').map(Number)
  return a! / b!
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** 把框夾在範圍內並取整數，最小 1×1 */
export function normalize(b: Box, bounds: Size): Box {
  const width = clamp(Math.round(b.width), 1, bounds.width)
  const height = clamp(Math.round(b.height), 1, bounds.height)
  return {
    x: clamp(Math.round(b.x), 0, bounds.width - width),
    y: clamp(Math.round(b.y), 0, bounds.height - height),
    width,
    height,
  }
}

/** 拖曳控制點；ratio 不為 null 時維持寬高比（以寬度為主） */
export function dragHandle(
  b: Box,
  h: Handle,
  d: { dx: number; dy: number },
  bounds: Size,
  ratio: number | null,
): Box {
  if (h === 'move') return normalize({ ...b, x: b.x + d.dx, y: b.y + d.dy }, bounds)
  let left = b.x
  let top = b.y
  let right = b.x + b.width
  let bottom = b.y + b.height
  if (h.includes('w')) left = clamp(left + d.dx, 0, right - 1)
  if (h.includes('e')) right = clamp(right + d.dx, left + 1, bounds.width)
  if (h.includes('n')) top = clamp(top + d.dy, 0, bottom - 1)
  if (h.includes('s')) bottom = clamp(bottom + d.dy, top + 1, bounds.height)
  if (ratio !== null) {
    let w = right - left
    let hh = w / ratio
    const maxH = h.includes('n') ? bottom : bounds.height - top
    if (hh > maxH) {
      hh = maxH
      w = hh * ratio
    }
    if (h.includes('w')) left = right - w
    else right = left + w
    if (h.includes('n')) top = bottom - hh
    else bottom = top + hh
  }
  return normalize({ x: left, y: top, width: right - left, height: bottom - top }, bounds)
}

export const moveBy = (b: Box, dx: number, dy: number, bounds: Size): Box =>
  normalize({ ...b, x: b.x + dx, y: b.y + dy }, bounds)

export const resizeBy = (b: Box, dw: number, dh: number, bounds: Size, ratio: number | null): Box =>
  dragHandle(b, 'se', { dx: dw, dy: dh }, bounds, ratio)

/** 依比例產生置中的最大裁切框 */
export function initialBox(bounds: Size, ratio: number | null): Box {
  if (ratio === null) return { x: 0, y: 0, width: bounds.width, height: bounds.height }
  let w = bounds.width
  let h = w / ratio
  if (h > bounds.height) {
    h = bounds.height
    w = h * ratio
  }
  return normalize(
    { x: (bounds.width - w) / 2, y: (bounds.height - h) / 2, width: w, height: h },
    bounds,
  )
}
