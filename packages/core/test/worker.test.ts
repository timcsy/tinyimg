import { describe, expect, it } from 'vitest'
import { createHandler, type WorkerOutMessage } from '../src/worker'
import { fakeCodecs } from './fixtures/fakeCodecs'
import { blank, gifBytes } from './fixtures/generate'

const request = (id: number) => ({
  id,
  targetBytes: 1024 * 1024,
  maxQuality: 0.8,
  format: 'auto' as const,
})
const file = (mimeType = 'image/jpeg', bytes = new Uint8Array(4_000_000)) => ({
  name: 'a.jpg',
  mimeType,
  bytes: bytes.buffer as ArrayBuffer,
})

function setup(overrides: Partial<Parameters<typeof createHandler>[0]> = {}) {
  const out: WorkerOutMessage[] = []
  const handle = createHandler({
    decode: async () => blank(1000, 1000),
    codecs: fakeCodecs({}),
    toPng: async () => new Uint8Array([1, 2, 3]),
    ...overrides,
  })
  return { out, run: (m: Parameters<typeof handle>[0]) => handle(m, (msg) => out.push(msg)) }
}

describe('worker handler', () => {
  it('compress 回傳 source 與 result', async () => {
    const { out, run } = setup()
    await run({ type: 'compress', id: 1, file: file(), request: request(1) })
    expect(out).toHaveLength(1)
    const m = out[0]!
    expect(m.type).toBe('result')
    if (m.type === 'result') {
      expect(m.id).toBe(1)
      expect(m.source).toMatchObject({
        name: 'a.jpg',
        width: 1000,
        height: 1000,
        hasAlpha: false,
        isAnimated: false,
      })
      expect(m.result.status).toBe('achieved')
    }
  })
  it('被新的 id 取代時，舊的不回傳', async () => {
    let release!: () => void
    const gate = new Promise<void>((r) => (release = r))
    let first = true
    const { out, run } = setup({
      decode: async () => {
        if (first) {
          first = false
          await gate
        }
        return blank(100, 100)
      },
    })
    const p1 = run({ type: 'compress', id: 1, file: file(), request: request(1) })
    const p2 = run({ type: 'compress', id: 2, file: file(), request: request(2) })
    await p2
    release()
    await p1
    expect(out.map((m) => m.id)).toEqual([2])
  })
  it('非圖片 → not-an-image', async () => {
    const { out, run } = setup()
    await run({ type: 'compress', id: 1, file: file('text/plain'), request: request(1) })
    expect(out[0]).toMatchObject({ type: 'error', id: 1, error: { code: 'not-an-image' } })
  })
  it('解碼失敗 → decode-failed', async () => {
    const { out, run } = setup({ decode: async () => Promise.reject(new Error('bad')) })
    await run({ type: 'compress', id: 1, file: file('image/heic'), request: request(1) })
    expect(out[0]).toMatchObject({ type: 'error', error: { code: 'decode-failed' } })
  })
  it('不合法請求 → invalid-request', async () => {
    const { out, run } = setup()
    await run({ type: 'compress', id: 1, file: file(), request: { ...request(1), targetBytes: 1 } })
    expect(out[0]).toMatchObject({ type: 'error', error: { code: 'invalid-request' } })
  })
  it('壓縮過程拋出未知錯誤 → internal', async () => {
    const codecs = fakeCodecs({})
    codecs.encode = async () => {
      throw new Error('boom')
    }
    const { out, run } = setup({ codecs })
    await run({ type: 'compress', id: 1, file: file(), request: request(1) })
    expect(out[0]).toMatchObject({ type: 'error', error: { code: 'internal' } })
  })
  it('GIF 動畫會標示 isAnimated', async () => {
    const { out, run } = setup()
    await run({
      type: 'compress',
      id: 1,
      file: { name: 'a.gif', mimeType: 'image/gif', bytes: gifBytes(3).buffer as ArrayBuffer },
      request: request(1),
    })
    const m = out[0]!
    expect(m.type === 'result' && m.source.isAnimated).toBe(true)
  })
  it('沒有 mimeType 時仍嘗試解碼', async () => {
    const { out, run } = setup()
    await run({ type: 'compress', id: 1, file: file(''), request: request(1) })
    expect(out[0]!.type).toBe('result')
  })
  it('to-png 回傳 png', async () => {
    const { out, run } = setup()
    await run({ type: 'to-png', id: 9, bytes: new ArrayBuffer(4), mimeType: 'image/jpeg' })
    expect(out[0]).toMatchObject({ type: 'png', id: 9 })
  })
  it('to-png 失敗 → error', async () => {
    const { out, run } = setup({ toPng: async () => Promise.reject(new Error('x')) })
    await run({ type: 'to-png', id: 9, bytes: new ArrayBuffer(4), mimeType: 'image/jpeg' })
    expect(out[0]).toMatchObject({ type: 'error', id: 9, error: { code: 'internal' } })
  })
})
