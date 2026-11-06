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
    expect(c.compress).toHaveBeenLastCalledWith(
      expect.any(File),
      { maxQuality: 0.5, targetBytes: 200 * 1024, format: 'webp' },
      undefined,
      undefined,
      undefined,
    )
  })
  it('setEdit 會帶著 edit 重送；之後改設定也沿用這個 edit', async () => {
    const c = fakeCompressor(async () => outcome())
    const ws = createWorkspace(c)
    await ws.setFile(file(), settings)
    const edit = {
      crop: { x: 0, y: 0, width: 1, height: 1 },
      rotation: 1 as const,
      flipX: false,
      output: { width: 1, height: 1 },
    }
    await ws.setEdit(edit)
    expect(c.compress).toHaveBeenLastCalledWith(
      expect.any(File),
      expect.any(Object),
      edit,
      undefined,
      undefined,
    )
    await ws.updateSettings({ ...settings, targetKB: 300 })
    expect(c.compress).toHaveBeenLastCalledWith(
      expect.any(File),
      expect.objectContaining({ targetBytes: 300 * 1024 }),
      edit,
      undefined,
      undefined,
    )
  })
  it('放入新檔案會清除舊的 edit', async () => {
    const c = fakeCompressor(async () => outcome())
    const ws = createWorkspace(c)
    await ws.setFile(file(), settings)
    await ws.setEdit({
      crop: { x: 0, y: 0, width: 1, height: 1 },
      rotation: 1,
      flipX: false,
      output: { width: 1, height: 1 },
    })
    await ws.setFile(file(), settings)
    expect(c.compress).toHaveBeenLastCalledWith(
      expect.any(File),
      expect.any(Object),
      undefined,
      undefined,
      undefined,
    )
  })
  it('沒有檔案時 setEdit 不送出', async () => {
    const c = fakeCompressor(async () => outcome())
    const ws = createWorkspace(c)
    await ws.setEdit({
      crop: { x: 0, y: 0, width: 1, height: 1 },
      rotation: 0,
      flipX: false,
      output: { width: 1, height: 1 },
    })
    expect(c.compress).not.toHaveBeenCalled()
  })
  it('setFile 才要求預覽（由 worker 解碼一次產生）；預覽送達後，改設定或編輯時不再要求', async () => {
    const c = fakeCompressor(async () => outcome())
    const ws = createWorkspace(c)
    const onPreview = vi.fn()
    await ws.setFile(file(), settings, onPreview)
    const cb = (c.compress as ReturnType<typeof vi.fn>).mock.lastCall![3] as (p: unknown) => void
    expect(typeof cb).toBe('function')
    cb({ source: { width: 1, height: 1 }, bitmap: 'b' }) // 預覽送達
    expect(onPreview).toHaveBeenCalledOnce()
    await ws.updateSettings({ ...settings, targetKB: 300 })
    expect((c.compress as ReturnType<typeof vi.fn>).mock.lastCall![3]).toBeUndefined()
  })
  it('setEdit 帶入註解時，壓縮請求一併帶上註解；沒有註解時不帶', async () => {
    const c = fakeCompressor(async () => outcome())
    const ws = createWorkspace(c)
    await ws.setFile(file(), settings)
    const edit = {
      crop: { x: 0, y: 0, width: 1, height: 1 },
      rotation: 0 as const,
      flipX: false,
      output: { width: 1, height: 1 },
    }
    const ann = [
      {
        id: 'a',
        kind: 'arrow' as const,
        points: [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
        color: '#e03131',
        width: 2,
      },
    ]
    await ws.setEdit(edit, ann)
    expect((c.compress as ReturnType<typeof vi.fn>).mock.lastCall![4]).toEqual(ann)
    await ws.setEdit(edit, [])
    expect((c.compress as ReturnType<typeof vi.fn>).mock.lastCall![4]).toBeUndefined()
  })
  it('預覽還沒送達前，後續的請求（例如改設定）會繼續要求預覽；送達後就不再要求', async () => {
    const calls: unknown[][] = []
    const c: Compressor = {
      compress: vi.fn(async (...args: unknown[]) => {
        calls.push(args)
        return outcome()
      }) as Compressor['compress'],
      toPng: vi.fn(),
      dispose: vi.fn(),
    }
    const ws = createWorkspace(c)
    const onPreview = vi.fn()
    await ws.setFile(file(), settings, onPreview)
    await ws.updateSettings({ ...settings, targetKB: 300 }) // 取代了第一個請求，預覽還沒送達
    const forwarded = calls[1]![3] as ((p: unknown) => void) | undefined
    expect(typeof forwarded).toBe('function')
    forwarded!({ source: { width: 1, height: 1 }, bitmap: 'b' })
    expect(onPreview).toHaveBeenCalledOnce()
    await ws.updateSettings({ ...settings, targetKB: 400 })
    expect(calls[2]![3]).toBeUndefined()
  })
})
