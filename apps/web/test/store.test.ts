import { describe, expect, it, vi } from 'vitest'
import type { Compressor, CompressOutcome } from '@tinyimg/core/client'
import { createWorkspace, type Settings } from '../src/lib/workspace'

const settings: Settings = { maxQuality: 80, targetKB: 1024, format: 'auto' }
const outcome = (status = 'achieved'): CompressOutcome => ({
  source: {
    name: 'a.png',
    mimeType: 'image/png',
    byteSize: 10,
    width: 1,
    height: 1,
    hasAlpha: false,
    isAnimated: false,
  },
  result: {
    status: status as 'achieved',
    bytes: new Uint8Array(5),
    mimeType: 'image/jpeg',
    width: 1,
    height: 1,
    quality: 0.8,
    colors: null,
    attempts: 1,
    warnings: [],
  },
})

function fakeCompressor(impl: Compressor['compress']): Compressor {
  return { compress: vi.fn(impl), toPng: vi.fn(), dispose: vi.fn() }
}
const file = () => new File([new Uint8Array(10)], 'a.png', { type: 'image/png' })

describe('workspace 狀態機', () => {
  it('idle → processing → done', async () => {
    const ws = createWorkspace(fakeCompressor(async () => outcome()))
    expect(ws.state.kind).toBe('idle')
    const p = ws.setFile(file(), settings)
    expect(ws.state.kind).toBe('processing')
    await p
    expect(ws.state.kind).toBe('done')
  })
  it('superseded 的結果被丟棄，狀態維持 processing', async () => {
    const ws = createWorkspace(fakeCompressor(async () => ({ superseded: true })))
    await ws.setFile(file(), settings)
    expect(ws.state.kind).toBe('processing')
  })
  it('錯誤 → error 狀態並保留訊息', async () => {
    const ws = createWorkspace(
      fakeCompressor(async () => Promise.reject({ code: 'decode-failed', message: '無法讀取' })),
    )
    await ws.setFile(file(), settings)
    expect(ws.state).toMatchObject({ kind: 'error', error: { message: '無法讀取' } })
  })
  it('不合法設定不送出請求，回報 invalid', async () => {
    const c = fakeCompressor(async () => outcome())
    const ws = createWorkspace(c)
    await ws.setFile(file(), { ...settings, targetKB: 0 })
    expect(c.compress).not.toHaveBeenCalled()
    expect(ws.state.kind).toBe('invalid')
  })
  it('沒有檔案時改設定不會送出', async () => {
    const c = fakeCompressor(async () => outcome())
    const ws = createWorkspace(c)
    await ws.updateSettings(settings)
    expect(c.compress).not.toHaveBeenCalled()
  })
  it('改設定會以新設定重送，並轉成 bytes 與比例', async () => {
    const c = fakeCompressor(async () => outcome())
    const ws = createWorkspace(c)
    await ws.setFile(file(), settings)
    await ws.updateSettings({ maxQuality: 50, targetKB: 200, format: 'webp' })
    expect(c.compress).toHaveBeenLastCalledWith(expect.any(File), {
      maxQuality: 0.5,
      targetBytes: 200 * 1024,
      format: 'webp',
    })
  })
})
