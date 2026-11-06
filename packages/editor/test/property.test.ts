import { describe, expect, it } from 'vitest'
import {
  applyAnnotations,
  applyEdit,
  identityEdit,
  sourceToOutputMatrix,
  type Annotation,
} from '@tinyimg/core'
import { createDocument } from '../src/document'
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

describe('屬性測試：混合「編輯 + 註解」的歷史（SC-003）', () => {
  it('100 組隨機序列：全部復原 = 原圖且沒有註解；全部重做 = 最終狀態', () => {
    const r = rng(303)
    const src = { width: 37, height: 23 }
    for (let t = 0; t < 100; t++) {
      const d = createDocument(src)
      let nextId = 0
      const n = 1 + Math.floor(r() * 50)
      for (let i = 0; i < n; i++) {
        const ids = d.annotations().map((a) => a.id)
        const k = r()
        if (k < 0.35) {
          d.push({
            type: 'annotate-add',
            annotation: {
              id: String(nextId++),
              kind: (['rect', 'arrow', 'step', 'mosaic'] as const)[Math.floor(r() * 4)]!,
              points: [
                { x: r() * 37, y: r() * 23 },
                { x: r() * 37, y: r() * 23 },
              ],
              color: '#e03131',
              width: 2,
            },
          })
        } else if (k < 0.45 && ids.length) {
          d.push({ type: 'annotate-remove', id: ids[Math.floor(r() * ids.length)]! })
        } else if (k < 0.55 && ids.length) {
          d.push({
            type: 'annotate-update',
            id: ids[Math.floor(r() * ids.length)]!,
            patch: { color: '#1c7ed6' },
          })
        } else {
          for (const op of randomOps(r, src, 1)) d.push(op)
        }
      }
      const finalEdit = d.state()
      const finalAnn = d.annotations()
      while (d.canUndo) d.undo()
      expect(d.state()).toEqual(identityEdit(src))
      expect(d.annotations()).toEqual([])
      while (d.canRedo) d.redo()
      expect(d.state()).toEqual(finalEdit)
      expect(d.annotations()).toEqual(finalAnn)
    }
  })
})

describe('屬性測試：註解跟著影像走（SC-004）', () => {
  it('50 組隨機的裁切、旋轉、翻轉後，馬賽克方塊出現在映射後的位置', async () => {
    const r = rng(404)
    const src = { width: 60, height: 40 }
    const img = coordImage(src.width, src.height)
    // 原圖 (12,12)–(24,24) 的 12×12 方塊打馬賽克
    const mosaic: Annotation = {
      id: 'm',
      kind: 'mosaic',
      points: [
        { x: 12, y: 12 },
        { x: 24, y: 24 },
      ],
      color: '#000000',
      width: 1,
    }
    const marked = await applyAnnotations(img, [mosaic])
    const center = { x: 18, y: 18 }
    const expected = Array.from(marked.data.slice((18 * 60 + 18) * 4, (18 * 60 + 18) * 4 + 4))
    let checked = 0
    for (let t = 0; t < 50; t++) {
      const ops = randomOps(r, src, 1 + Math.floor(r() * 6)).filter((o) => o.type !== 'reset')
      const s = applyOps(src, ops)
      const [a, b, c, dd, e, f] = sourceToOutputMatrix(s)
      const ox = Math.floor(a * center.x + c * center.y + e)
      const oy = Math.floor(b * center.x + dd * center.y + f)
      if (ox < 0 || oy < 0 || ox >= s.output.width || oy >= s.output.height) continue // 被裁掉了
      const out = await applyEdit(marked, s)
      const i = (oy * out.width + ox) * 4
      expect(Array.from(out.data.slice(i, i + 4)), JSON.stringify(ops)).toEqual(expected)
      checked++
    }
    expect(checked).toBeGreaterThan(10)
  })
})
