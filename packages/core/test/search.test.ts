import { describe, expect, it } from 'vitest'
import { searchQuality } from '../src/search'
import { CancelledError } from '../src/types'

// 大小 = 1000 × q × 10（單調）
const encoder = () => {
  const calls: number[] = []
  const fn = async (q: number) => {
    calls.push(q)
    return new Uint8Array(Math.round(q * 10_000))
  }
  return { calls, fn }
}

describe('searchQuality', () => {
  it('品質上限就符合時只編碼 1 次', async () => {
    const e = encoder()
    const r = await searchQuality(e.fn, 9000, 0.8)
    expect(e.calls).toEqual([0.8])
    expect(r.best?.quality).toBe(0.8)
    expect(r.attempts).toBe(1)
  })
  it('找到符合目標的最高品質（誤差 0.02 內），且在 [0.3, max] 內', async () => {
    const e = encoder()
    const r = await searchQuality(e.fn, 5000, 0.8)
    expect(r.best).not.toBeNull()
    expect(r.best!.bytes.length).toBeLessThanOrEqual(5000)
    expect(r.best!.quality).toBeGreaterThanOrEqual(0.48)
    expect(r.best!.quality).toBeLessThanOrEqual(0.5)
    expect(Math.min(...e.calls)).toBeGreaterThanOrEqual(0.3)
  })
  it('總嘗試次數不超過 7（1 + 6）', async () => {
    const e = encoder()
    const r = await searchQuality(e.fn, 4567, 1)
    expect(r.attempts).toBeLessThanOrEqual(7)
    expect(e.calls.length).toBe(r.attempts)
  })
  it('下限 0.3 仍不符合時 best 為 null，smallest 為最小結果', async () => {
    const e = encoder()
    const r = await searchQuality(e.fn, 1000, 0.8)
    expect(r.best).toBeNull()
    expect(r.smallest.quality).toBe(0.3)
    expect(r.attempts).toBe(2)
  })
  it('品質上限低於 0.3 時以上限為下限', async () => {
    const e = encoder()
    const r = await searchQuality(e.fn, 100, 0.2)
    expect(e.calls).toEqual([0.2])
    expect(r.best).toBeNull()
  })
  it('isCancelled 為 true 時丟出 CancelledError', async () => {
    const e = encoder()
    await expect(
      searchQuality(e.fn, 5000, 0.8, { isCancelled: () => true }),
    ).rejects.toBeInstanceOf(CancelledError)
  })
})
