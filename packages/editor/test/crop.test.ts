import { describe, expect, it } from 'vitest'
import { dragHandle, initialBox, moveBy, ratioValue, resizeBy, type Box } from '../src/crop'

const bounds = { width: 400, height: 300 }
const box: Box = { x: 100, y: 100, width: 100, height: 50 }

describe('dragHandle', () => {
  it('自由比例拖曳右下角', () => {
    expect(dragHandle(box, 'se', { dx: 20, dy: 10 }, bounds, null)).toEqual({
      x: 100,
      y: 100,
      width: 120,
      height: 60,
    })
  })
  it('1:1 時維持正方形', () => {
    const b = dragHandle(
      { x: 100, y: 100, width: 100, height: 100 },
      'se',
      { dx: 40, dy: 5 },
      bounds,
      1,
    )
    expect(b.width).toBe(b.height)
  })
  it('左上角拖曳會移動原點', () => {
    expect(dragHandle(box, 'nw', { dx: -10, dy: -10 }, bounds, null)).toEqual({
      x: 90,
      y: 90,
      width: 110,
      height: 60,
    })
  })
  it('不會超出圖片範圍', () => {
    const b = dragHandle(box, 'se', { dx: 1000, dy: 1000 }, bounds, null)
    expect(b.x + b.width).toBeLessThanOrEqual(400)
    expect(b.y + b.height).toBeLessThanOrEqual(300)
  })
  it('最小 1×1，不會翻轉成負值', () => {
    const b = dragHandle(box, 'se', { dx: -500, dy: -500 }, bounds, null)
    expect(b.width).toBeGreaterThanOrEqual(1)
    expect(b.height).toBeGreaterThanOrEqual(1)
  })
  it('拖曳中心（move）整體移動並夾在範圍內', () => {
    expect(dragHandle(box, 'move', { dx: 1000, dy: 0 }, bounds, null)).toEqual({
      x: 300,
      y: 100,
      width: 100,
      height: 50,
    })
  })
})

describe('鍵盤', () => {
  it('moveBy 移動並夾在範圍內', () => {
    expect(moveBy(box, -1, 0, bounds)).toEqual({ ...box, x: 99 })
    expect(moveBy(box, -1000, 0, bounds).x).toBe(0)
  })
  it('resizeBy 調整右下角，最小 1', () => {
    expect(resizeBy(box, 10, 0, bounds, null)).toEqual({ ...box, width: 110 })
    expect(resizeBy(box, -1000, 0, bounds, null).width).toBe(1)
  })
})

describe('ratioValue', () => {
  it('對應比例', () => {
    expect(ratioValue('free', bounds)).toBeNull()
    expect(ratioValue('original', bounds)).toBeCloseTo(4 / 3)
    expect(ratioValue('16:9', bounds)).toBeCloseTo(16 / 9)
  })
})

describe('initialBox（選擇比例時的預設裁切框）', () => {
  it('自由比例為全圖', () => {
    expect(initialBox(bounds, null)).toEqual({ x: 0, y: 0, width: 400, height: 300 })
  })
  it('寬比例（16:9）以寬為準並垂直置中', () => {
    expect(initialBox(bounds, 16 / 9)).toEqual({ x: 0, y: 38, width: 400, height: 225 })
  })
  it('窄比例（1:1）以高為準並水平置中', () => {
    expect(initialBox(bounds, 1)).toEqual({ x: 50, y: 0, width: 300, height: 300 })
  })
})

describe('比例鎖定碰到邊界', () => {
  it('往下拖到底時，以高度上限反推寬度，仍維持比例', () => {
    const b = dragHandle(
      { x: 0, y: 200, width: 50, height: 50 },
      'se',
      { dx: 300, dy: 0 },
      bounds,
      1,
    )
    expect(b.y + b.height).toBeLessThanOrEqual(300)
    expect(b.width).toBe(b.height)
  })
  it('從左上角拖曳並鎖定比例', () => {
    const b = dragHandle(
      { x: 100, y: 100, width: 100, height: 100 },
      'nw',
      { dx: -20, dy: -5 },
      bounds,
      1,
    )
    expect(b.width).toBe(b.height)
    expect(b.x + b.width).toBe(200)
    expect(b.y + b.height).toBe(200)
  })
})
