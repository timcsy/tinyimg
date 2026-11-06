import { describe, expect, it } from 'vitest'
import { mapToPalette, quantize, samplePixels } from '../src/quantize'
import { blank, photo, screenshot, transparent } from './fixtures/generate'

const uniqueColors = (d: Uint8ClampedArray) => {
  const s = new Set<number>()
  for (let i = 0; i < d.length; i += 4)
    s.add(((d[i]! << 24) | (d[i + 1]! << 16) | (d[i + 2]! << 8) | d[i + 3]!) >>> 0)
  return s.size
}

describe('samplePixels', () => {
  it('小圖原樣取樣', () => {
    const img = blank(10, 10)
    expect(samplePixels(img, 1000).length).toBe(10 * 10 * 4)
  })
  it('大圖取樣數不超過上限', () => {
    expect(samplePixels(photo(1000, 1000), 50_000).length / 4).toBeLessThanOrEqual(50_000)
  })
})

describe('mapToPalette', () => {
  it('每個像素都映射到調色盤中的顏色', () => {
    const palette = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255])
    const out = mapToPalette(photo(50, 50), palette)
    for (let i = 0; i < out.data.length; i += 4) {
      const c = Array.from(out.data.slice(i, i + 4))
      expect([
        [0, 0, 0, 255],
        [255, 255, 255, 255],
      ]).toContainEqual(c)
    }
  })
})

describe('quantize', () => {
  it('輸出色數不超過指定值', async () => {
    const out = await quantize(photo(300, 200), 64)
    expect(uniqueColors(out.data)).toBeLessThanOrEqual(64)
  })
  it('色數已經足夠少時，顏色維持不變', async () => {
    const img = blank(20, 20, [10, 20, 30, 255])
    img.data.set([200, 100, 50, 255], 0)
    const out = await quantize(img, 256)
    expect(out.data).toEqual(img.data)
  })
  it('保留透明度（全透明仍為全透明）', async () => {
    const out = await quantize(transparent(100, 80), 64)
    expect(out.data[3]).toBe(0)
  })
  // 回歸防線，不是精確效能門檻：舊做法（全圖逐像素比對調色盤）在 1MP 就要 5 秒以上，
  // 5MP 約 27 秒；牆鐘時間在 CI 負載下會浮動，所以門檻放寬。真正的效能目標由 E2E 驗證。
  it('效能回歸防線：2880×1800 截圖在 15 秒內完成', async () => {
    const t0 = performance.now()
    await quantize(screenshot(2880, 1800, 1), 256)
    expect(performance.now() - t0).toBeLessThan(15_000)
  })
})
