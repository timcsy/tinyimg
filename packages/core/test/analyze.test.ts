import { describe, expect, it } from 'vitest'
import { flattenAlpha, hasAlpha, isAnimatedGif } from '../src/analyze'
import { blank, gifBytes, transparent } from './fixtures/generate'

describe('hasAlpha', () => {
  it('全不透明時為 false', () => {
    expect(hasAlpha(blank(4, 4))).toBe(false)
  })
  it('任一像素 alpha < 255 時為 true', () => {
    const img = blank(4, 4)
    img.data[4 * 7 + 3] = 254
    expect(hasAlpha(img)).toBe(true)
  })
})

describe('flattenAlpha', () => {
  it('預設鋪白底，輸出全不透明', () => {
    const out = flattenAlpha(transparent(40, 30))
    expect(hasAlpha(out)).toBe(false)
    // 角落原本全透明，應變成白色
    expect(Array.from(out.data.slice(0, 4))).toEqual([255, 255, 255, 255])
  })
  it('半透明像素依 alpha 混合指定背景', () => {
    const img = blank(1, 1, [0, 0, 0, 128])
    const out = flattenAlpha(img, [255, 255, 255])
    expect(out.data[0]).toBeGreaterThan(120)
    expect(out.data[0]).toBeLessThan(135)
  })
  it('不修改輸入', () => {
    const img = transparent(10, 10)
    const before = img.data.slice()
    flattenAlpha(img)
    expect(img.data).toEqual(before)
  })
})

describe('isAnimatedGif', () => {
  it('2 幀為 true', () => expect(isAnimatedGif(gifBytes(2))).toBe(true))
  it('1 幀為 false', () => expect(isAnimatedGif(gifBytes(1))).toBe(false))
  it('非 GIF 為 false', () =>
    expect(isAnimatedGif(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(false))
  it('截斷的 GIF 不會丟例外', () => expect(isAnimatedGif(gifBytes(2).slice(0, 20))).toBe(false))
})
