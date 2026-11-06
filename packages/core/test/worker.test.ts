import { describe, expect, it } from 'vitest'
import { createHandler, type WorkerOutMessage } from '../src/worker'
import { fakeCodecs } from './fixtures/fakeCodecs'
import { blank, gifBytes } from './fixtures/generate'
import { identityEdit } from '../src/edit'
import type { RawImage } from '../src/types'

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
  it('帶有 edit 時，結果尺寸等於 edit.output', async () => {
    const { out, run } = setup()
    const edit = {
      ...identityEdit({ width: 1000, height: 1000 }),
      rotation: 1 as const,
      crop: { x: 0, y: 0, width: 400, height: 200 },
      output: { width: 200, height: 400 },
    }
    await run({ type: 'compress', id: 1, file: file(), request: request(1), edit })
    const m = out[0]!
    expect(m.type === 'result' && [m.result.width, m.result.height]).toEqual([200, 400])
    expect(m.type === 'result' && [m.source.width, m.source.height]).toEqual([1000, 1000])
  })
  it('有編輯時，絕不回傳未編輯的原始檔（即使原圖已符合目標）', async () => {
    const { out, run } = setup({ decode: async () => blank(100, 100) })
    const small = new Uint8Array(500)
    const edit = { ...identityEdit({ width: 100, height: 100 }), flipX: true }
    await run({
      type: 'compress',
      id: 1,
      file: { name: 'a.jpg', mimeType: 'image/jpeg', bytes: small.buffer as ArrayBuffer },
      request: request(1),
      edit,
    })
    const m = out[0]!
    expect(m.type === 'result' && m.result.status).not.toBe('original-fits')
  })
  it('wantPreview 時，先送出 preview（原始尺寸與預覽物件），再送結果', async () => {
    const fakeBitmap = { kind: 'bitmap' }
    const { out, run } = setup({ preview: async () => fakeBitmap })
    await run({ type: 'compress', id: 1, file: file(), request: request(1), wantPreview: true })
    expect(out.map((m) => m.type)).toEqual(['preview', 'result'])
    expect(out[0]).toMatchObject({ type: 'preview', id: 1, source: { width: 1000, height: 1000 } })
    expect(out[0]!.type === 'preview' && out[0]!.bitmap).toBe(fakeBitmap)
  })
  it('沒有要求預覽時不產生 preview', async () => {
    let called = false
    const { out, run } = setup({
      preview: async () => {
        called = true
        return {}
      },
    })
    await run({ type: 'compress', id: 1, file: file(), request: request(1) })
    expect(called).toBe(false)
    expect(out.map((m) => m.type)).toEqual(['result'])
  })
  it('預覽失敗不影響壓縮結果', async () => {
    const { out, run } = setup({ preview: async () => Promise.reject(new Error('x')) })
    await run({ type: 'compress', id: 1, file: file(), request: request(1), wantPreview: true })
    expect(out.map((m) => m.type)).toEqual(['result'])
  })
  it('處理結束後呼叫 release 釋放解碼資源（成功或失敗都會）', async () => {
    const released: unknown[] = []
    const img = blank(100, 100)
    const { run } = setup({ decode: async () => img, release: (i) => released.push(i) })
    await run({ type: 'compress', id: 1, file: file(), request: request(1) })
    expect(released).toEqual([img])
    const codecs = fakeCodecs({})
    codecs.encode = async () => Promise.reject(new Error('boom'))
    const failing = setup({ decode: async () => img, codecs, release: (i) => released.push(i) })
    await failing.run({ type: 'compress', id: 2, file: file(), request: request(2) })
    expect(released).toEqual([img, img])
  })
  it('同一個 fileKey 再次壓縮時不重新解碼（例如每次編輯）', async () => {
    let decodes = 0
    const { out, run } = setup({
      decode: async () => {
        decodes++
        return blank(100, 100)
      },
    })
    await run({ type: 'compress', id: 1, file: file(), request: request(1), fileKey: 7 })
    await run({ type: 'compress', id: 2, file: file(), request: request(2), fileKey: 7 })
    expect(decodes).toBe(1)
    expect(out.map((m) => m.type)).toEqual(['result', 'result'])
    await run({ type: 'compress', id: 3, file: file(), request: request(3), fileKey: 8 })
    expect(decodes).toBe(2)
  })
  it('有快取時，release 只在快取被新檔案取代時才呼叫', async () => {
    const released: unknown[] = []
    const a = blank(10, 10)
    const b = blank(20, 20)
    let n = 0
    const { run } = setup({
      decode: async () => (n++ === 0 ? a : b),
      release: (i) => released.push(i),
    })
    await run({ type: 'compress', id: 1, file: file(), request: request(1), fileKey: 1 })
    await run({ type: 'compress', id: 2, file: file(), request: request(2), fileKey: 1 })
    expect(released).toEqual([])
    await run({ type: 'compress', id: 3, file: file(), request: request(3), fileKey: 2 })
    expect(released).toEqual([a])
  })
  it('帶有 annotations 時不回傳原始檔，並把向量註解交給 drawVectors', async () => {
    const seen: string[][] = []
    const { out, run } = setup({
      decode: async () => blank(100, 100),
      drawVectors: async (img, vectors) => {
        seen.push(vectors.map((a) => a.kind))
        return img
      },
    })
    const small = new Uint8Array(500)
    const annotations = [
      {
        id: 'a',
        kind: 'arrow' as const,
        points: [
          { x: 1, y: 1 },
          { x: 50, y: 50 },
        ],
        color: '#e03131',
        width: 4,
      },
    ]
    await run({
      type: 'compress',
      id: 1,
      file: { name: 'a.jpg', mimeType: 'image/jpeg', bytes: small.buffer as ArrayBuffer },
      request: request(1),
      annotations,
    })
    const m = out[0]!
    expect(m.type === 'result' && m.result.status).not.toBe('original-fits')
    expect(seen).toEqual([['arrow']])
  })
  it('馬賽克在 applyEdit 之前執行（裁切後送去編碼的影像仍是方塊化的）', async () => {
    const encoded: RawImage[] = []
    const codecs = fakeCodecs({})
    const orig = codecs.encode
    codecs.encode = async (img, f, q) => {
      encoded.push(img)
      return orig(img, f, q)
    }
    const src = blank(60, 60)
    for (let i = 0; i < src.data.length; i += 4) src.data[i] = (i / 4) % 251
    const { run } = setup({ decode: async () => src, codecs })
    const edit = {
      ...identityEdit({ width: 60, height: 60 }),
      crop: { x: 0, y: 0, width: 24, height: 24 },
      output: { width: 24, height: 24 },
    }
    await run({
      type: 'compress',
      id: 1,
      file: file(),
      request: request(1),
      edit,
      annotations: [
        {
          id: 'm',
          kind: 'mosaic',
          points: [
            { x: 0, y: 0 },
            { x: 24, y: 24 },
          ],
          color: '#000000',
          width: 1,
        },
      ],
    })
    const img = encoded[0]!
    expect([img.width, img.height]).toEqual([24, 24])
    // 第一個 12×12 方塊內 R 值全部相同
    const r0 = img.data[0]
    for (let y = 0; y < 12; y++)
      for (let x = 0; x < 12; x++) expect(img.data[(y * 24 + x) * 4]).toBe(r0)
  })

  // spec 007：同一個檔案、同樣的設定、同樣的像素面積（例如旋轉、翻轉、註解），從上次的縮放比例開始
  it('編輯後重新壓縮：從上次結果的比例開始；設定或面積改變時不沿用', async () => {
    const codecs = fakeCodecs({})
    const { out, run } = setup({ decode: async () => blank(2000, 2000), codecs })
    const fullSize = () =>
      codecs.calls.filter((c) => c.kind === 'encode' && c.width * c.height === 2000 * 2000).length
    await run({ type: 'compress', id: 1, file: file(), request: request(1), fileKey: 1 })
    const first = out[0]!
    expect(first.type === 'result' && first.result.width).toBeLessThan(2000)
    const afterFirst = fullSize()
    expect(afterFirst).toBeGreaterThan(0)

    const rotated = { ...identityEdit({ width: 2000, height: 2000 }), rotation: 1 as const }
    await run({
      type: 'compress',
      id: 2,
      file: file(),
      request: request(2),
      fileKey: 1,
      edit: rotated,
    })
    expect(fullSize()).toBe(afterFirst) // 沒有再試原尺寸
    const second = out[1]!
    expect(second.type === 'result' && second.result.status).toBe('achieved')

    // 目標大小改變 → 不沿用
    await run({
      type: 'compress',
      id: 3,
      file: file(),
      request: { ...request(3), targetBytes: 2 * 1024 * 1024 },
      fileKey: 1,
      edit: rotated,
    })
    expect(fullSize()).toBeGreaterThan(afterFirst)

    // 裁切讓面積改變 → 不沿用（從裁切後的原尺寸開始）
    const before = codecs.calls.length
    const crop = {
      ...identityEdit({ width: 2000, height: 2000 }),
      crop: { x: 0, y: 0, width: 1500, height: 1500 },
      output: { width: 1500, height: 1500 },
    }
    await run({
      type: 'compress',
      id: 4,
      file: file(),
      request: request(4),
      fileKey: 1,
      edit: crop,
    })
    expect(codecs.calls[before]).toMatchObject({ kind: 'encode', width: 1500, height: 1500 })
  })
})
