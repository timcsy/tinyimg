import type { RawImage } from '@tinyimg/core'
import type { Op } from '../src/ops'

/** 參考實作：直接在像素上逐步套用操作（不含 resize），用來對照 applyEdit */
export function referenceApply(img: RawImage, ops: Op[]): RawImage {
  let cur = img
  for (const op of ops) {
    if (op.type === 'reset') cur = img
    else if (op.type === 'rotate') cur = rotate(cur, op.direction)
    else if (op.type === 'flip') cur = op.axis === 'x' ? flipX(cur) : flipY(cur)
    else if (op.type === 'crop') cur = crop(cur, op.x, op.y, op.width, op.height)
    else throw new Error('reference 不支援 resize')
  }
  return cur
}

const get = (img: RawImage, x: number, y: number) =>
  img.data.subarray((y * img.width + x) * 4, (y * img.width + x) * 4 + 4)
function make(w: number, h: number, f: (x: number, y: number) => Uint8ClampedArray): RawImage {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data.set(f(x, y), (y * w + x) * 4)
  return { width: w, height: h, data }
}
function rotate(img: RawImage, dir: 1 | -1): RawImage {
  const { width: w, height: h } = img
  return dir === 1
    ? make(h, w, (x, y) => get(img, y, h - 1 - x))
    : make(h, w, (x, y) => get(img, w - 1 - y, x))
}
const flipX = (img: RawImage) =>
  make(img.width, img.height, (x, y) => get(img, img.width - 1 - x, y))
const flipY = (img: RawImage) =>
  make(img.width, img.height, (x, y) => get(img, x, img.height - 1 - y))
function crop(img: RawImage, x0: number, y0: number, w: number, h: number): RawImage {
  return make(w, h, (x, y) => get(img, x0 + x, y0 + y))
}
