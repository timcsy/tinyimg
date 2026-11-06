import { describe, expect, it } from 'vitest'
import { applyEdit } from '@tinyimg/core'
import { applyOps } from '../src/ops'
import { coordImage, randomOps, rng } from './gen'
import { referenceApply } from './reference'

describe('屬性測試：applyEdit(標準化狀態) ≡ 逐步套用（SC-002）', () => {
  const src = { width: 37, height: 23 }
  const img = coordImage(src.width, src.height)
  it('200 組隨機序列（長度 1–50）逐像素相同', async () => {
    const r = rng(2026)
    for (let t = 0; t < 200; t++) {
      const ops = randomOps(r, src, 1 + Math.floor(r() * 50))
      const expected = referenceApply(img, ops)
      const actual = await applyEdit(img, applyOps(src, ops))
      expect([actual.width, actual.height], JSON.stringify(ops)).toEqual([
        expected.width,
        expected.height,
      ])
      expect(actual.data, JSON.stringify(ops)).toEqual(expected.data)
    }
  })
})
