import { describe, expect, it, vi } from 'vitest'
import {
  applyAnnotations,
  mosaicBlock,
  pixelate,
  renderAnnotations,
  type Annotation,
  type Ctx2D,
} from '../src/annotations'
import type { RawImage } from '../src/types'

/** 每個像素顏色都不同的影像（R、G 編碼座標），方便確認像素有沒有被改 */
function gradient(w: number, h: number): RawImage {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) data.set([x * 3, y * 3, (x + y) & 255, 255], (y * w + x) * 4)
  return { width: w, height: h, data }
}
const px = (img: RawImage, x: number, y: number) =>
  Array.from(img.data.slice((y * img.width + x) * 4, (y * img.width + x) * 4 + 4))

describe('pixelate', () => {
  const img = gradient(80, 60)
  const rect = { x: 10, y: 10, width: 40, height: 30 }

  it('區域內每個方塊都只剩單一顏色', () => {
    const out = pixelate(img, rect, 12)
    for (let by = rect.y; by < rect.y + rect.height; by += 12) {
      for (let bx = rect.x; bx < rect.x + rect.width; bx += 12) {
        const first = px(out, bx, by)
        for (let y = by; y < Math.min(by + 12, rect.y + rect.height); y++)
          for (let x = bx; x < Math.min(bx + 12, rect.x + rect.width); x++)
            expect(px(out, x, y)).toEqual(first)
      }
    }
  })
  it('方塊顏色是平均色，與原本的像素不同（原始細節被破壞）', () => {
    const out = pixelate(img, rect, 12)
    expect(px(out, 10, 10)).not.toEqual(px(img, 10, 10))
    expect(px(out, 10, 10)[0]).toBeGreaterThan(px(img, 10, 10)[0]!)
  })
  it('區域外的像素完全不變', () => {
    const out = pixelate(img, rect, 12)
    for (let y = 0; y < 60; y++)
      for (let x = 0; x < 80; x++) {
        const inside = x >= 10 && x < 50 && y >= 10 && y < 40
        if (!inside) expect(px(out, x, y)).toEqual(px(img, x, y))
      }
  })
  it('不修改輸入；區域超出影像時被夾在範圍內', () => {
    const before = img.data.slice()
    const out = pixelate(img, { x: 70, y: 50, width: 100, height: 100 }, 12)
    expect(img.data).toEqual(before)
    expect(out.data.length).toBe(img.data.length)
  })
})

describe('mosaicBlock', () => {
  it.each([
    [{ width: 40, height: 30 }, 12],
    [{ width: 1000, height: 400 }, 20],
    [{ width: 1000, height: 1000 }, 50],
  ])('%o → %i', (r, n) => expect(mosaicBlock({ x: 0, y: 0, ...r })).toBe(n))
})

function fakeCtx() {
  const calls: string[] = []
  const ctx = new Proxy({} as Record<string, unknown>, {
    get(target, prop: string) {
      if (prop in target) return target[prop]
      return (...args: unknown[]) => {
        calls.push(
          `${prop}(${args.map((a) => (typeof a === 'number' ? Math.round(a) : a)).join(',')})`,
        )
      }
    },
    set(target, prop: string, value) {
      target[prop] = value
      calls.push(`${prop}=${value}`)
      return true
    },
  }) as unknown as Ctx2D
  return { ctx, calls }
}
const ann = (over: Partial<Annotation>): Annotation => ({
  id: 'a',
  kind: 'rect',
  points: [
    { x: 10, y: 10 },
    { x: 50, y: 40 },
  ],
  color: '#e03131',
  width: 4,
  ...over,
})

describe('renderAnnotations', () => {
  it('矩形：設定顏色與線寬後描邊', () => {
    const { ctx, calls } = fakeCtx()
    renderAnnotations(ctx, [ann({})])
    expect(calls).toContain('strokeStyle=#e03131')
    expect(calls).toContain('lineWidth=4')
    expect(calls).toContain('strokeRect(10,10,40,30)')
  })
  it('從右下往左上拖曳的矩形，也會正規化成正的寬高', () => {
    const { ctx, calls } = fakeCtx()
    renderAnnotations(ctx, [
      ann({
        points: [
          { x: 50, y: 40 },
          { x: 10, y: 10 },
        ],
      }),
    ])
    expect(calls).toContain('strokeRect(10,10,40,30)')
  })
  it('橢圓、箭頭、畫筆、螢光筆、文字、編號都會發出繪製指令', () => {
    const { ctx, calls } = fakeCtx()
    renderAnnotations(ctx, [
      ann({ id: '1', kind: 'ellipse' }),
      ann({ id: '2', kind: 'arrow' }),
      ann({
        id: '3',
        kind: 'pen',
        points: [
          { x: 1, y: 1 },
          { x: 5, y: 5 },
          { x: 9, y: 2 },
        ],
      }),
      ann({
        id: '4',
        kind: 'highlighter',
        points: [
          { x: 1, y: 1 },
          { x: 9, y: 1 },
        ],
      }),
      ann({ id: '5', kind: 'text', points: [{ x: 20, y: 20 }], text: '重點' }),
      ann({ id: '6', kind: 'step', points: [{ x: 30, y: 30 }] }),
      ann({ id: '7', kind: 'step', points: [{ x: 40, y: 30 }] }),
    ])
    expect(calls.some((c) => c.startsWith('ellipse('))).toBe(true)
    expect(calls.filter((c) => c === 'stroke()').length).toBeGreaterThanOrEqual(3)
    expect(calls.some((c) => c.startsWith('fillText(重點'))).toBe(true)
    // 編號依順序：1、2
    expect(calls.some((c) => c.startsWith('fillText(1,'))).toBe(true)
    expect(calls.some((c) => c.startsWith('fillText(2,'))).toBe(true)
    // 螢光筆是半透明
    expect(calls).toContain('globalAlpha=0.4')
  })
  it('略過馬賽克（由 pixelate 處理）', () => {
    const { ctx, calls } = fakeCtx()
    renderAnnotations(ctx, [ann({ kind: 'mosaic' })])
    expect(calls.filter((c) => !c.startsWith('save') && !c.startsWith('restore'))).toEqual([])
  })
  it('每個註解前後都有 save 與 restore，樣式不會互相影響', () => {
    const { ctx, calls } = fakeCtx()
    renderAnnotations(ctx, [ann({}), ann({ id: 'b', kind: 'ellipse' })])
    expect(calls.filter((c) => c === 'save()').length).toBe(2)
    expect(calls.filter((c) => c === 'restore()').length).toBe(2)
  })
})

describe('applyAnnotations', () => {
  it('先對馬賽克執行 pixelate，再把向量註解交給 draw', async () => {
    const img = gradient(80, 60)
    const draw = vi.fn(async (i: RawImage, _v: Annotation[]) => i)
    const list = [ann({ kind: 'mosaic' }), ann({ id: 'b', kind: 'arrow' })]
    const out = await applyAnnotations(img, list, draw)
    expect(px(out, 10, 10)).not.toEqual(px(img, 10, 10))
    expect(draw).toHaveBeenCalledOnce()
    expect(draw.mock.calls[0]![1].map((a: Annotation) => a.kind)).toEqual(['arrow'])
    expect(px(draw.mock.calls[0]![0], 10, 10)).toEqual(px(out, 10, 10))
  })
  it('沒有向量註解時不呼叫 draw；沒有註解時原樣回傳', async () => {
    const img = gradient(20, 20)
    const draw = vi.fn(async (i: RawImage, _v: Annotation[]) => i)
    await applyAnnotations(
      img,
      [
        ann({
          kind: 'mosaic',
          points: [
            { x: 0, y: 0 },
            { x: 15, y: 15 },
          ],
        }),
      ],
      draw,
    )
    expect(draw).not.toHaveBeenCalled()
    expect(await applyAnnotations(img, [], draw)).toBe(img)
  })
})
