import { describe, expect, it } from 'vitest'
import { validateRequest } from '../src/validate'
import { isCompressError } from '../src/types'

const ok = { id: 1, targetBytes: 1024 * 1024, maxQuality: 0.8, format: 'auto' }

describe('validateRequest', () => {
  it('合法請求原樣通過', () => {
    expect(validateRequest(ok)).toEqual(ok)
  })
  it.each([
    ['targetBytes 太小', { ...ok, targetBytes: 50 * 1024 - 1 }],
    ['targetBytes 太大', { ...ok, targetBytes: 10240 * 1024 + 1 }],
    ['targetBytes NaN', { ...ok, targetBytes: Number.NaN }],
    ['maxQuality 太小', { ...ok, maxQuality: 0.09 }],
    ['maxQuality 太大', { ...ok, maxQuality: 1.01 }],
    ['未知格式', { ...ok, format: 'gif' }],
    ['缺 id', { targetBytes: ok.targetBytes, maxQuality: 0.8, format: 'auto' }],
    ['null', null],
    ['字串', 'hello'],
  ])('%s → invalid-request', (_name, req) => {
    const r = validateRequest(req)
    expect(isCompressError(r)).toBe(true)
    if (isCompressError(r)) {
      expect(r.code).toBe('invalid-request')
      expect(r.message).toMatch(/[一-鿿]/)
    }
  })
  it('邊界值可通過', () => {
    expect(
      isCompressError(validateRequest({ ...ok, targetBytes: 50 * 1024, maxQuality: 0.1 })),
    ).toBe(false)
    expect(
      isCompressError(validateRequest({ ...ok, targetBytes: 10240 * 1024, maxQuality: 1 })),
    ).toBe(false)
  })
})
