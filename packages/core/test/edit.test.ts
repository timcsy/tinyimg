import { describe, expect, it, vi } from 'vitest'
import {
  applyEdit,
  identityEdit,
  mapPoint,
  orientedSize,
  sourceToOutputMatrix,
  type EditState,
} from '../src/edit'
import type { RawImage } from '../src/types'

/** 每個像素的 R、G 分別編碼 x、y，B 固定 7，方便追蹤像素移到哪裡 */
function coordImage(w: number, h: number): RawImage {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) data.set([x, y, 7, 255], (y * w + x) * 4)
  return { width: w, height: h, data }
}
const px = (img: RawImage, x: number, y: number) =>
  Array.from(img.data.slice((y * img.width + x) * 4, (y * img.width + x) * 4 + 2))
const state = (over: Partial<EditState>, w = 40, h = 30): EditState => ({
  ...identityEdit({ width: w, height: h }),
  ...over,
})

describe('identityEdit / orientedSize', () => {
  it('identity 為全圖、不旋轉、輸出等於原圖', () => {
    expect(identityEdit({ width: 40, height: 30 })).toEqual({
      crop: { x: 0, y: 0, width: 40, height: 30 },
      rotation: 0,
      flipX: false,
      output: { width: 40, height: 30 },
    })
  })
  it('rotation 為奇數時寬高互換', () => {
    expect(orientedSize(state({ rotation: 1 }))).toEqual({ width: 30, height: 40 })
    expect(orientedSize(state({ rotation: 2 }))).toEqual({ width: 40, height: 30 })
  })
})

describe('applyEdit（像素精確）', () => {
  const img = coordImage(40, 30)
  it('identity 原樣輸出', async () => {
    const out = await applyEdit(img, identityEdit({ width: 40, height: 30 }))
    expect(out.data).toEqual(img.data)
  })
  it('裁切', async () => {
    const out = await applyEdit(
      img,
      state({ crop: { x: 5, y: 3, width: 10, height: 8 }, output: { width: 10, height: 8 } }),
    )
    expect([out.width, out.height]).toEqual([10, 8])
    expect(px(out, 0, 0)).toEqual([5, 3])
    expect(px(out, 9, 7)).toEqual([14, 10])
  })
  it('順時針旋轉一次：左上 → 右上', async () => {
    const out = await applyEdit(img, state({ rotation: 1, output: { width: 30, height: 40 } }))
    expect([out.width, out.height]).toEqual([30, 40])
    expect(px(out, 29, 0)).toEqual([0, 0])
    expect(px(out, 0, 0)).toEqual([0, 29])
  })
  it('旋轉 180°：左上 → 右下', async () => {
    const out = await applyEdit(img, state({ rotation: 2 }))
    expect(px(out, 39, 29)).toEqual([0, 0])
  })
  it('逆時針（rotation 3）：左上 → 左下', async () => {
    const out = await applyEdit(img, state({ rotation: 3, output: { width: 30, height: 40 } }))
    expect(px(out, 0, 39)).toEqual([0, 0])
  })
  it('水平翻轉：最左 → 最右', async () => {
    const out = await applyEdit(img, state({ flipX: true }))
    expect(px(out, 39, 0)).toEqual([0, 0])
    expect(px(out, 0, 5)).toEqual([39, 5])
  })
  it('flipX 在旋轉之後套用', async () => {
    const out = await applyEdit(
      img,
      state({ rotation: 1, flipX: true, output: { width: 30, height: 40 } }),
    )
    // 先旋轉：原 (0,0) 到 (29,0)；再水平翻轉：到 (0,0)
    expect(px(out, 0, 0)).toEqual([0, 0])
  })
  it('輸出尺寸不同時呼叫 resize', async () => {
    const resize = vi.fn(async (_i: RawImage, w: number, h: number) => coordImage(w, h))
    const out = await applyEdit(img, state({ output: { width: 20, height: 15 } }), resize)
    expect(resize).toHaveBeenCalledWith(expect.objectContaining({ width: 40, height: 30 }), 20, 15)
    expect([out.width, out.height]).toEqual([20, 15])
  })
  it('沒有提供 resize 時使用內建縮放', async () => {
    const out = await applyEdit(img, state({ output: { width: 20, height: 15 } }))
    expect([out.width, out.height]).toEqual([20, 15])
  })
  it('不修改輸入', async () => {
    const before = img.data.slice()
    await applyEdit(img, state({ rotation: 1, flipX: true, output: { width: 30, height: 40 } }))
    expect(img.data).toEqual(before)
  })
})

describe('mapPoint（輸出座標 → 原圖座標）', () => {
  it('與 applyEdit 一致', async () => {
    const s = state({
      crop: { x: 4, y: 2, width: 20, height: 10 },
      rotation: 1,
      flipX: true,
      output: { width: 10, height: 20 },
    })
    const out = await applyEdit(coordImage(40, 30), s)
    for (const [x, y] of [
      [0, 0],
      [9, 19],
      [3, 7],
    ] as const) {
      const p = mapPoint(s, { x: x + 0.5, y: y + 0.5 })
      expect([Math.floor(p.x), Math.floor(p.y)]).toEqual(px(out, x, y))
    }
  })
})

describe('sourceToOutputMatrix（畫布預覽用）', () => {
  it('把原圖座標映到輸出座標，與 mapPoint 互為反函數', () => {
    const s = state({
      crop: { x: 4, y: 2, width: 20, height: 10 },
      rotation: 3,
      flipX: true,
      output: { width: 20, height: 40 },
    })
    const [a, b, c, d, e, f] = sourceToOutputMatrix(s)
    for (const p of [
      { x: 0, y: 0 },
      { x: 7.5, y: 13 },
      { x: 20, y: 40 },
    ]) {
      const q = mapPoint(s, p)
      expect(a * q.x + c * q.y + e).toBeCloseTo(p.x)
      expect(b * q.x + d * q.y + f).toBeCloseTo(p.y)
    }
  })
})
