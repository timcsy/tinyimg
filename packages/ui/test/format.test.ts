import { describe, expect, it } from 'vitest'
import { downloadName, formatBytes, savingLabel, statusLabel } from '../src/lib/format'

describe('formatBytes', () => {
  it.each([
    [0, '0 B'],
    [512, '512 B'],
    [1536, '1.5 KB'],
    [1048576, '1 MB'],
    [5.25 * 1048576, '5.25 MB'],
  ])('%i → %s', (n, s) => expect(formatBytes(n)).toBe(s))
})

describe('savingLabel', () => {
  it('變小時顯示節省', () => expect(savingLabel(1000, 250)).toBe('節省 75%'))
  it('變大時顯示增加，不出現負數', () => {
    expect(savingLabel(1000, 1500)).toBe('增加 50%')
    expect(savingLabel(1000, 1500)).not.toMatch(/-/)
  })
  it('相同時為 0%', () => expect(savingLabel(1000, 1000)).toBe('節省 0%'))
  it('小數一位', () => expect(savingLabel(3, 2)).toBe('節省 33.3%'))
})

describe('downloadName', () => {
  it.each([
    ['a.png', 'image/jpeg', 'a_compressed.jpg'],
    ['photo.final.JPG', 'image/webp', 'photo.final_compressed.webp'],
    ['noext', 'image/png', 'noext_compressed.png'],
    ['pasted-image', 'image/jpeg', 'pasted-image_compressed.jpg'],
  ])('%s + %s → %s', (name, mime, out) => expect(downloadName(name, mime)).toBe(out))
})

describe('statusLabel', () => {
  it('三種狀態', () => {
    expect(statusLabel('achieved', 0)).toBe('已達成目標')
    expect(statusLabel('original-fits', 0)).toBe('原圖已符合目標')
    expect(statusLabel('unreachable', 2048)).toBe('無法達成目標（最小 2 KB）')
  })
})
