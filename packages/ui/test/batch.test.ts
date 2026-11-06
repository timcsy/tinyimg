import { describe, expect, it } from 'vitest'
import { runBatch, uniqueNames, type BatchItem } from '../src/lib/batch'

const files = (n: number) => Array.from({ length: n }, (_, i) => ({ name: `f${i}.png` }))

describe('runBatch', () => {
  it('依序處理：同一時間只有一個在處理', async () => {
    let active = 0
    let maxActive = 0
    const out = await runBatch(files(5), async (f) => {
      active++
      maxActive = Math.max(maxActive, active)
      await new Promise((r) => setTimeout(r, 5))
      active--
      return `ok:${f.name}`
    })
    expect(maxActive).toBe(1)
    expect(out.map((i) => i.status)).toEqual(['done', 'done', 'done', 'done', 'done'])
    expect(out[2]!.result).toBe('ok:f2.png')
  })
  it('某一張失敗不影響其他，錯誤會保留下來', async () => {
    const out = await runBatch(files(3), async (f) => {
      if (f.name === 'f1.png') throw { message: '壞掉了' }
      return 1
    })
    expect(out.map((i) => i.status)).toEqual(['done', 'error', 'done'])
    expect(out[1]!.error).toEqual({ message: '壞掉了' })
  })
  it('取消後不再開始新的項目；已完成的保留', async () => {
    let cancelled = false
    const out = await runBatch(
      files(4),
      async (f) => {
        if (f.name === 'f1.png') cancelled = true
        return 1
      },
      { isCancelled: () => cancelled },
    )
    expect(out.map((i) => i.status)).toEqual(['done', 'done', 'cancelled', 'cancelled'])
  })
  it('onUpdate 回報每次狀態轉換', async () => {
    const seen: string[] = []
    await runBatch(files(2), async () => 1, {
      onUpdate: (items: BatchItem<{ name: string }, number>[]) =>
        seen.push(items.map((i) => i.status).join(',')),
    })
    expect(seen).toEqual(['processing,pending', 'done,pending', 'done,processing', 'done,done'])
  })
})

describe('uniqueNames', () => {
  it('重複的檔名加上序號，副檔名保留', () => {
    expect(uniqueNames(['a.jpg', 'b.jpg', 'a.jpg', 'a.jpg', 'c'])).toEqual([
      'a.jpg',
      'b.jpg',
      'a (2).jpg',
      'a (3).jpg',
      'c',
    ])
  })
})
