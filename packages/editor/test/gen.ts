import { orientedSize, type RawImage } from '@tinyimg/core'
import { applyOps, type Op } from '../src/ops'

export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), a | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
export function coordImage(w: number, h: number): RawImage {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) data.set([x, y, (x * 7 + y) & 255, 255], (y * w + x) * 4)
  return { width: w, height: h, data }
}

/** 產生隨機但合法的操作序列（不含 resize；crop 永遠在目前畫面範圍內、整數座標） */
export function randomOps(
  r: () => number,
  src: { width: number; height: number },
  n: number,
): Op[] {
  const ops: Op[] = []
  let size = { ...src }
  for (let i = 0; i < n; i++) {
    const k = r()
    let op: Op
    if (k < 0.3) op = { type: 'rotate', direction: r() < 0.5 ? 1 : -1 }
    else if (k < 0.55) op = { type: 'flip', axis: r() < 0.5 ? 'x' : 'y' }
    else if (k < 0.95 && size.width > 2 && size.height > 2) {
      const w = 1 + Math.floor(r() * (size.width - 1))
      const h = 1 + Math.floor(r() * (size.height - 1))
      op = {
        type: 'crop',
        x: Math.floor(r() * (size.width - w + 1)),
        y: Math.floor(r() * (size.height - h + 1)),
        width: w,
        height: h,
      }
    } else op = { type: 'reset' }
    ops.push(op)
    size = orientedSize(applyOps(src, ops))
  }
  return ops
}
