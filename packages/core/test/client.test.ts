import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCompressor, type WorkerLike } from '../src/client'
import type { WorkerInMessage, WorkerOutMessage } from '../src/worker'

class FakeWorker implements WorkerLike {
  static instances: FakeWorker[] = []
  onmessage: ((e: { data: WorkerOutMessage }) => void) | null = null
  sent: WorkerInMessage[] = []
  terminated = false
  constructor() {
    FakeWorker.instances.push(this)
  }
  postMessage(m: WorkerInMessage) {
    this.sent.push(m)
  }
  terminate() {
    this.terminated = true
  }
  reply(m: WorkerOutMessage) {
    this.onmessage?.({ data: m })
  }
}

const req = { targetBytes: 1024 * 1024, maxQuality: 0.8, format: 'auto' as const }
const blob = () => new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' })
const fakeResult = (id: number): WorkerOutMessage => ({
  type: 'result',
  id,
  source: {
    name: 'a',
    mimeType: 'image/png',
    byteSize: 3,
    width: 1,
    height: 1,
    hasAlpha: false,
    isAnimated: false,
  },
  result: {
    status: 'achieved',
    bytes: new Uint8Array(1),
    mimeType: 'image/jpeg',
    width: 1,
    height: 1,
    quality: 0.8,
    colors: null,
    attempts: 1,
    warnings: [],
  },
})

afterEach(() => {
  FakeWorker.instances = []
  vi.useRealTimers()
})

const make = (timeoutMs = 30_000) =>
  createCompressor({ timeoutMs, createWorker: () => new FakeWorker() })
const flush = () => new Promise((r) => setTimeout(r, 0))

describe('createCompressor', () => {
  it('送出 compress 並回傳結果', async () => {
    const c = make()
    const p = c.compress(blob(), req)
    await flush()
    const w = FakeWorker.instances[0]!
    const sent = w.sent[0]!
    expect(sent).toMatchObject({
      type: 'compress',
      file: { name: 'pasted-image', mimeType: 'image/png' },
    })
    w.reply(fakeResult(sent.id))
    await expect(p).resolves.toMatchObject({ result: { status: 'achieved' } })
  })
  it('File 會帶上檔名', async () => {
    const c = make()
    void c.compress(new File([new Uint8Array(1)], 'x.png', { type: 'image/png' }), req)
    await flush()
    expect(FakeWorker.instances[0]!.sent[0]).toMatchObject({ file: { name: 'x.png' } })
  })
  it('新請求讓舊的 resolve 成 superseded，且 id 遞增', async () => {
    const c = make()
    const p1 = c.compress(blob(), req)
    await flush()
    const p2 = c.compress(blob(), req)
    await expect(p1).resolves.toEqual({ superseded: true })
    await flush()
    const w = FakeWorker.instances[0]!
    expect(w.sent[1]!.id).toBeGreaterThan(w.sent[0]!.id)
    w.reply(fakeResult(w.sent[0]!.id)) // 遲到的舊結果被忽略
    w.reply(fakeResult(w.sent[1]!.id))
    await expect(p2).resolves.toMatchObject({ result: { status: 'achieved' } })
  })
  it('worker 回報錯誤時 reject CompressError', async () => {
    const c = make()
    const p = c.compress(blob(), req)
    await flush()
    const w = FakeWorker.instances[0]!
    w.reply({
      type: 'error',
      id: w.sent[0]!.id,
      error: { code: 'decode-failed', message: '無法解碼' },
    })
    await expect(p).rejects.toEqual({ code: 'decode-failed', message: '無法解碼' })
  })
  it('逾時 → reject timeout，並重建 worker', async () => {
    vi.useFakeTimers()
    const c = make(30_000)
    const p = c.compress(blob(), req)
    const assertion = expect(p).rejects.toMatchObject({ code: 'timeout' })
    await vi.advanceTimersByTimeAsync(30_001)
    await assertion
    expect(FakeWorker.instances[0]!.terminated).toBe(true)
    void c.compress(blob(), req)
    await vi.advanceTimersByTimeAsync(0)
    expect(FakeWorker.instances).toHaveLength(2)
  })
  it('toPng 回傳 bytes', async () => {
    const c = make()
    const p = c.toPng(new Uint8Array([9]), 'image/jpeg')
    const w = FakeWorker.instances[0]!
    const sent = w.sent[0]!
    expect(sent.type).toBe('to-png')
    w.reply({ type: 'png', id: sent.id, bytes: new Uint8Array([7]).buffer })
    await expect(p).resolves.toEqual(new Uint8Array([7]))
  })
  it('toPng 錯誤 → reject', async () => {
    const c = make()
    const p = c.toPng(new Uint8Array([9]), 'image/jpeg')
    const w = FakeWorker.instances[0]!
    w.reply({ type: 'error', id: w.sent[0]!.id, error: { code: 'internal', message: 'x' } })
    await expect(p).rejects.toMatchObject({ code: 'internal' })
  })
  it('dispose 終止 worker，並讓進行中的請求 superseded', async () => {
    const c = make()
    const p = c.compress(blob(), req)
    await flush()
    c.dispose()
    await expect(p).resolves.toEqual({ superseded: true })
    expect(FakeWorker.instances[0]!.terminated).toBe(true)
  })
})
