import { describe, expect, it } from 'vitest'
import type { Annotation } from '@tinyimg/core'
import { annotationLabel, hitTest, moveAnnotation, stepNumber } from '../src/annotate'
import { createDocument, deserialize, serialize } from '../src/document'

const src = { width: 400, height: 300 }
const a = (id: string, over: Partial<Annotation> = {}): Annotation => ({
  id,
  kind: 'rect',
  points: [
    { x: 10, y: 10 },
    { x: 50, y: 40 },
  ],
  color: '#e03131',
  width: 4,
  ...over,
})

describe('文件中的註解操作', () => {
  it('新增、修改、刪除會反映在 annotations()', () => {
    const d = createDocument(src)
    d.push({ type: 'annotate-add', annotation: a('1') })
    d.push({ type: 'annotate-add', annotation: a('2', { kind: 'arrow' }) })
    d.push({ type: 'annotate-update', id: '1', patch: { color: '#1c7ed6' } })
    d.push({ type: 'annotate-remove', id: '2' })
    expect(d.annotations().map((x) => [x.id, x.color])).toEqual([['1', '#1c7ed6']])
  })
  it('與編輯操作共用同一條復原、重做歷史', () => {
    const d = createDocument(src)
    d.push({ type: 'rotate', direction: 1 })
    d.push({ type: 'annotate-add', annotation: a('1') })
    d.undo()
    expect(d.annotations()).toEqual([])
    expect(d.state().rotation).toBe(1)
    d.undo()
    expect(d.state().rotation).toBe(0)
    d.redo()
    d.redo()
    expect(d.annotations()).toHaveLength(1)
  })
  it('reset 只重設編輯，不刪除註解', () => {
    const d = createDocument(src)
    d.push({ type: 'annotate-add', annotation: a('1') })
    d.push({ type: 'rotate', direction: 1 })
    d.push({ type: 'reset' })
    expect(d.state().rotation).toBe(0)
    expect(d.annotations()).toHaveLength(1)
  })
  it('對不存在的註解修改或刪除會丟出錯誤，且不改變歷史', () => {
    const d = createDocument(src)
    expect(() => d.push({ type: 'annotate-remove', id: 'x' })).toThrow()
    expect(() => d.push({ type: 'annotate-update', id: 'x', patch: {} })).toThrow()
    expect(d.canUndo).toBe(false)
  })
  it('重複的 id 不能新增', () => {
    const d = createDocument(src)
    d.push({ type: 'annotate-add', annotation: a('1') })
    expect(() => d.push({ type: 'annotate-add', annotation: a('1') })).toThrow()
  })
  it('序列化後還原，註解也一起還原', () => {
    const d = createDocument(src)
    d.push({
      type: 'annotate-add',
      annotation: a('1', { kind: 'text', text: '你好', points: [{ x: 5, y: 5 }] }),
    })
    expect(deserialize(serialize(d)).annotations()).toEqual(d.annotations())
  })
  it('超過 100 步時，最舊的註解操作併入基準，註解仍在', () => {
    const d = createDocument(src)
    d.push({ type: 'annotate-add', annotation: a('keep') })
    for (let i = 0; i < 120; i++) d.push({ type: 'rotate', direction: 1 })
    while (d.canUndo) d.undo()
    expect(d.annotations().map((x) => x.id)).toEqual(['keep'])
  })
})

describe('stepNumber', () => {
  it('依清單中編號標記的順序；刪除後遞補', () => {
    const list = [
      a('s1', { kind: 'step' }),
      a('r'),
      a('s2', { kind: 'step' }),
      a('s3', { kind: 'step' }),
    ]
    expect(stepNumber(list, 's3')).toBe(3)
    expect(
      stepNumber(
        list.filter((x) => x.id !== 's2'),
        's3',
      ),
    ).toBe(2)
    expect(stepNumber(list, 'r')).toBeNull()
  })
})

describe('hitTest', () => {
  const list = [
    a('rect'),
    a('line', {
      kind: 'arrow',
      points: [
        { x: 100, y: 100 },
        { x: 200, y: 100 },
      ],
    }),
    a('top', {
      points: [
        { x: 30, y: 20 },
        { x: 60, y: 60 },
      ],
    }),
  ]
  it('點在矩形內命中；重疊時回傳最上層（清單後面的）', () => {
    expect(hitTest(list, { x: 15, y: 15 }, 3)).toBe('rect')
    expect(hitTest(list, { x: 40, y: 30 }, 3)).toBe('top')
  })
  it('線段在容許誤差內命中', () => {
    expect(hitTest(list, { x: 150, y: 104 }, 3)).toBe('line')
    expect(hitTest(list, { x: 150, y: 120 }, 3)).toBeNull()
  })
  it('畫筆以折線距離命中；編號以圓形命中；文字以估計的方框命中', () => {
    const more = [
      a('pen', {
        kind: 'pen',
        points: [
          { x: 300, y: 10 },
          { x: 320, y: 30 },
          { x: 340, y: 10 },
        ],
      }),
      a('step', { kind: 'step', points: [{ x: 300, y: 200 }] }),
      a('text', { kind: 'text', points: [{ x: 10, y: 200 }], text: '標題文字' }),
    ]
    expect(hitTest(more, { x: 320, y: 31 }, 3)).toBe('pen')
    expect(hitTest(more, { x: 305, y: 205 }, 0)).toBe('step')
    expect(hitTest(more, { x: 30, y: 210 }, 0)).toBe('text')
  })
})

describe('moveAnnotation', () => {
  it('移動所有點，不修改輸入', () => {
    const r = a('1')
    const m = moveAnnotation(r, 5, -3)
    expect(m.points).toEqual([
      { x: 15, y: 7 },
      { x: 55, y: 37 },
    ])
    expect(r.points[0]).toEqual({ x: 10, y: 10 })
  })
})

describe('annotationLabel', () => {
  it('種類、順序與顏色名稱', () => {
    const list = [
      a('1', { kind: 'arrow' }),
      a('2', { kind: 'arrow', color: '#1c7ed6' }),
      a('3', { kind: 'step' }),
    ]
    expect(annotationLabel(list, '2')).toBe('箭頭 2，藍色')
    expect(annotationLabel(list, '3')).toBe('編號 1，紅色')
  })
})

describe('hitTest：其他情況', () => {
  it('螢光筆的命中範圍是一般線寬的 3 倍', () => {
    const pen = a('p', {
      kind: 'pen',
      width: 4,
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
    })
    const hl = a('h', {
      kind: 'highlighter',
      width: 4,
      points: [
        { x: 0, y: 200 },
        { x: 100, y: 200 },
      ],
    })
    expect(hitTest([pen], { x: 50, y: 5 }, 0)).toBeNull()
    expect(hitTest([hl], { x: 50, y: 205 }, 0)).toBe('h')
  })
  it('只點一下的畫筆（單點）以圓形命中', () => {
    const dot = a('d', { kind: 'pen', points: [{ x: 10, y: 10 }] })
    expect(hitTest([dot], { x: 11, y: 11 }, 1)).toBe('d')
    expect(hitTest([dot], { x: 30, y: 30 }, 1)).toBeNull()
  })
  it('點不足的形狀不會命中', () => {
    expect(hitTest([a('x', { points: [{ x: 1, y: 1 }] })], { x: 1, y: 1 }, 5)).toBeNull()
    expect(hitTest([a('y', { kind: 'arrow', points: [] })], { x: 1, y: 1 }, 5)).toBeNull()
  })
})

describe('annotationLabel：其他情況', () => {
  it('文字註解會帶出內容；調色盤以外的顏色顯示色碼；找不到 id 回傳空字串', () => {
    const list = [
      a('t', { kind: 'text', text: '注意', points: [{ x: 1, y: 1 }], color: '#123456' }),
    ]
    expect(annotationLabel(list, 't')).toBe('文字 1「注意」，#123456')
    expect(annotationLabel(list, 'nope')).toBe('')
  })
})
