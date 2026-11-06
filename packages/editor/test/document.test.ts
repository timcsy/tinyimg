import { describe, expect, it } from 'vitest'
import { identityEdit } from '@tinyimg/core'
import { applyOps } from '../src/ops'
import { createDocument, deserialize, serialize } from '../src/document'
import { randomOps, rng } from './gen'

const src = { width: 37, height: 23 }

describe('EditorDocument', () => {
  it('初始為 identity，不能復原或重做', () => {
    const d = createDocument(src)
    expect(d.state()).toEqual(identityEdit(src))
    expect([d.canUndo, d.canRedo]).toEqual([false, false])
  })
  it('push 會清掉重做堆疊', () => {
    const d = createDocument(src)
    d.push({ type: 'rotate', direction: 1 })
    d.undo()
    expect(d.canRedo).toBe(true)
    d.push({ type: 'flip', axis: 'x' })
    expect(d.canRedo).toBe(false)
  })
  it('邊界外的 undo、redo 不做事', () => {
    const d = createDocument(src)
    d.undo()
    d.redo()
    expect(d.state()).toEqual(identityEdit(src))
  })
  it('隨機序列：全部復原 = identity；全部重做 = 最終狀態（SC-003）', () => {
    const r = rng(7)
    for (let t = 0; t < 50; t++) {
      const ops = randomOps(r, src, 1 + Math.floor(r() * 50))
      const d = createDocument(src)
      ops.forEach((op) => d.push(op))
      const final = d.state()
      expect(final).toEqual(applyOps(src, ops))
      while (d.canUndo) d.undo()
      expect(d.state()).toEqual(identityEdit(src))
      while (d.canRedo) d.redo()
      expect(d.state()).toEqual(final)
    }
  })
  it('最多保留 100 步，超過時最舊的步驟併入基準，最終狀態不變', () => {
    const d = createDocument(src)
    const ops = Array.from(
      { length: 120 },
      (_, i) => ({ type: 'rotate', direction: i % 3 === 0 ? -1 : 1 }) as const,
    )
    ops.forEach((op) => d.push(op))
    expect(d.state()).toEqual(applyOps(src, ops))
    let n = 0
    while (d.canUndo) {
      d.undo()
      n++
    }
    expect(n).toBe(100)
    expect(d.state()).toEqual(applyOps(src, ops.slice(0, 20)))
  })
  it('序列化後還原，狀態與游標相同', () => {
    const d = createDocument(src)
    d.push({ type: 'crop', x: 1, y: 2, width: 10, height: 8 })
    d.push({ type: 'rotate', direction: 1 })
    d.undo()
    const back = deserialize(serialize(d))
    expect(back.state()).toEqual(d.state())
    expect(back.canRedo).toBe(true)
  })
  it.each([
    'not json',
    '{}',
    '{"version":2}',
    '{"version":1,"source":{"width":1,"height":1},"ops":[{"type":"zzz"}],"cursor":1}',
    '{"version":1,"source":{"width":1,"height":1},"ops":[],"cursor":3}',
  ])('不合法的內容丟出錯誤：%s', (s) => expect(() => deserialize(s)).toThrow())
})
