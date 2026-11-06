import { describe, expect, it } from 'vitest'
import { resolveFormat } from '../src/format'

describe('resolveFormat', () => {
  it('auto + 有透明 → png', () => expect(resolveFormat('auto', true)).toBe('png'))
  it('auto + 無透明 → jpeg', () => expect(resolveFormat('auto', false)).toBe('jpeg'))
  it.each(['jpeg', 'png', 'webp'] as const)('明確指定 %s 原樣回傳', (f) => {
    expect(resolveFormat(f, true)).toBe(f)
    expect(resolveFormat(f, false)).toBe(f)
  })
})
