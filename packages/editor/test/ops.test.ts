import { describe, expect, it } from 'vitest'
import { identityEdit, orientedSize } from '@tinyimg/core'
import { applyOp, applyOps, type Op } from '../src/ops'

const src = { width: 400, height: 300 }
const id = identityEdit(src)
const run = (ops: Op[]) => applyOps(src, ops)

describe('applyOp', () => {
  it('rotate 順時針：輸出寬高互換', () => {
    const s = applyOp(id, { type: 'rotate', direction: 1 }, src)
    expect(s.rotation).toBe(1)
    expect(s.output).toEqual({ width: 300, height: 400 })
  })
  it('旋轉 4 次回到原狀', () => {
    const r = { type: 'rotate', direction: 1 } as const
    expect(run([r, r, r, r])).toEqual(id)
  })
  it('順、逆各一次回到原狀', () => {
    expect(
      run([
        { type: 'rotate', direction: 1 },
        { type: 'rotate', direction: -1 },
      ]),
    ).toEqual(id)
  })
  it.each(['x', 'y'] as const)('對 %s 軸翻轉兩次回到原狀', (axis) => {
    expect(
      run([
        { type: 'flip', axis },
        { type: 'flip', axis },
      ]),
    ).toEqual(id)
  })
  it('crop 以目前畫面座標表示，並轉成原圖座標', () => {
    const s = run([
      { type: 'rotate', direction: 1 },
      { type: 'crop', x: 0, y: 0, width: 100, height: 50 },
    ])
    // 旋轉後畫面左上角對應原圖左下角
    expect(s.crop).toEqual({ x: 0, y: 200, width: 50, height: 100 })
    expect(s.output).toEqual({ width: 100, height: 50 })
  })
  it('crop 會夾在範圍內並取整數', () => {
    const s = run([{ type: 'crop', x: -10, y: 10.6, width: 1000, height: 50.2 }])
    expect(s.crop.x).toBe(0)
    expect(s.crop.x + s.crop.width).toBeLessThanOrEqual(400)
    expect(Number.isInteger(s.crop.y) && Number.isInteger(s.crop.height)).toBe(true)
  })
  it('resize 之後 crop 以縮放後的座標換算', () => {
    const s = run([
      { type: 'resize', width: 200, height: 150 },
      { type: 'crop', x: 0, y: 0, width: 100, height: 75 },
    ])
    expect(s.crop).toEqual({ x: 0, y: 0, width: 200, height: 150 })
    expect(s.output).toEqual({ width: 100, height: 75 })
  })
  it('resize 範圍：1 px 到 4 倍', () => {
    expect(() => run([{ type: 'resize', width: 0, height: 10 }])).toThrow(RangeError)
    expect(() => run([{ type: 'resize', width: 1601, height: 10 }])).toThrow(RangeError)
    expect(run([{ type: 'resize', width: 1600, height: 1200 }]).output).toEqual({
      width: 1600,
      height: 1200,
    })
  })
  it('reset 回到 identity', () => {
    expect(
      run([{ type: 'rotate', direction: 1 }, { type: 'flip', axis: 'x' }, { type: 'reset' }]),
    ).toEqual(id)
  })
  it('旋轉後 orientedSize 與 output 一致（無 resize 時）', () => {
    const s = run([
      { type: 'crop', x: 10, y: 10, width: 120, height: 80 },
      { type: 'rotate', direction: -1 },
    ])
    expect(orientedSize(s)).toEqual(s.output)
  })
})
