import { describe, expect, it } from 'vitest'
import { boxResize, fitLongestEdge, nextScale } from '../src/resize'
import { blank, photo } from './fixtures/generate'

describe('boxResize', () => {
  it('輸出尺寸正確', () => {
    const out = boxResize(photo(300, 200), 150, 100)
    expect([out.width, out.height, out.data.length]).toEqual([150, 100, 150 * 100 * 4])
  })
  it('純色圖縮放後顏色不變', () => {
    const out = boxResize(blank(97, 61, [10, 200, 30, 255]), 33, 20)
    for (let i = 0; i < out.data.length; i += 4) {
      expect(Array.from(out.data.slice(i, i + 4))).toEqual([10, 200, 30, 255])
    }
  })
  it('放大或同尺寸也能運作', () => {
    expect(boxResize(blank(2, 2), 4, 4).width).toBe(4)
    expect(boxResize(blank(5, 5), 5, 5).height).toBe(5)
  })
})

describe('fitLongestEdge', () => {
  it('依比例縮放並至少為 1', () => {
    expect(fitLongestEdge(4000, 2000, 1000)).toEqual({ width: 1000, height: 500 })
    expect(fitLongestEdge(2000, 4000, 1000)).toEqual({ width: 500, height: 1000 })
    expect(fitLongestEdge(10000, 1, 320)).toEqual({ width: 320, height: 1 })
  })
})

describe('nextScale', () => {
  it.each([
    [10_000_000, 100],
    [2_000_000, 1_000_000],
    [1_000_001, 1_000_000],
    [100, 100],
  ])('current=%i target=%i 時介於 0.5 與 0.9', (c, t) => {
    const s = nextScale(c, t)
    expect(s).toBeGreaterThanOrEqual(0.5)
    expect(s).toBeLessThanOrEqual(0.9)
  })
  it('差距越大縮得越多', () => {
    expect(nextScale(4_000_000, 1_000_000)).toBeLessThan(nextScale(1_200_000, 1_000_000))
  })
})
