import { describe, expect, it } from 'vitest'
import { compressToTarget } from '../src/compress'
import { CancelledError, type CompressRequest, type SourceInfo } from '../src/types'
import { fakeCodecs } from './fixtures/fakeCodecs'
import { blank, transparent } from './fixtures/generate'

const MB = 1024 * 1024
const KB = 1024

function source(over: Partial<SourceInfo> = {}, bytes = new Uint8Array(4 * MB)) {
  return {
    name: 'a.jpg',
    mimeType: 'image/jpeg',
    byteSize: bytes.length,
    width: 1000,
    height: 1000,
    hasAlpha: false,
    isAnimated: false,
    ...over,
    bytes,
  }
}
const req = (over: Partial<CompressRequest> = {}): CompressRequest => ({
  id: 1,
  targetBytes: MB,
  maxQuality: 0.8,
  format: 'auto',
  ...over,
})

describe('compressToTarget：不變式', () => {
  it.each([
    [50 * KB, 'jpeg'],
    [200 * KB, 'webp'],
    [MB, 'jpeg'],
    [50 * KB, 'png'],
    [300 * KB, 'png'],
    [5 * MB, 'auto'],
  ] as const)('target=%i format=%s：非 unreachable 時一定不超標', async (targetBytes, format) => {
    const r = await compressToTarget(
      blank(1000, 1000),
      source(),
      req({ targetBytes, format }),
      fakeCodecs({}),
    )
    if (r.status !== 'unreachable') expect(r.bytes.length).toBeLessThanOrEqual(targetBytes)
    else expect(r.bytes.length).toBeGreaterThan(targetBytes)
  })
})

describe('compressToTarget：有損格式', () => {
  it('調品質即可達成時不縮尺寸，品質在 [0.3, max]', async () => {
    const codecs = fakeCodecs({})
    const r = await compressToTarget(blank(1000, 1000), source(), req(), codecs)
    expect(r.status).toBe('achieved')
    expect([r.width, r.height]).toEqual([1000, 1000])
    expect(r.quality!).toBeGreaterThanOrEqual(0.3)
    expect(r.quality!).toBeLessThanOrEqual(0.8)
    expect(r.mimeType).toBe('image/jpeg')
    expect(r.colors).toBeNull()
    expect(r.attempts).toBe(codecs.calls.length)
    expect(r.attempts).toBeLessThanOrEqual(7)
  })
  it('品質不夠時縮小尺寸並保持比例', async () => {
    const r = await compressToTarget(
      blank(2000, 1000),
      source({ width: 2000, height: 1000 }),
      req({ targetBytes: 200 * KB }),
      fakeCodecs({}),
    )
    expect(r.status).toBe('achieved')
    expect(r.width).toBeLessThan(2000)
    expect(r.width / r.height).toBeCloseTo(2, 1)
  })
  it('使用 codecs.resize（若有提供）', async () => {
    const codecs = fakeCodecs({ withResize: true })
    await compressToTarget(blank(1000, 1000), source(), req({ targetBytes: 200 * KB }), codecs)
    expect(codecs.calls.some((c) => c.kind === 'resize')).toBe(true)
  })
  it('縮到最長邊 320 仍不行 → unreachable，回傳最小結果', async () => {
    const codecs = fakeCodecs({})
    const r = await compressToTarget(
      blank(1000, 1000),
      source(),
      req({ targetBytes: 50 * KB }),
      codecs,
    )
    expect(r.status).toBe('unreachable')
    expect(Math.max(r.width, r.height)).toBe(320)
    const sizes = codecs.calls.map((c) => Math.round(c.width * c.height * (0.2 + c.quality! * 1.8)))
    expect(r.bytes.length).toBe(Math.min(...sizes))
  })
  it('minEdge 可調整', async () => {
    const r = await compressToTarget(
      blank(1000, 1000),
      source(),
      req({ targetBytes: 50 * KB }),
      fakeCodecs({}),
      { minEdge: 100 },
    )
    expect(r.status).toBe('achieved')
  })
  it('原圖比 minEdge 小且壓不下來 → 直接 unreachable', async () => {
    const r = await compressToTarget(
      blank(200, 200),
      source({ width: 200, height: 200 }),
      req({ targetBytes: 50 * KB }),
      fakeCodecs({ lossyBpp: () => 100 }),
    )
    expect(r.status).toBe('unreachable')
    expect([r.width, r.height]).toEqual([200, 200])
  })
})

describe('compressToTarget：PNG', () => {
  it('先試 256 色；不符合再往下試 128 色（無損不會比量化小，不必先試）', async () => {
    const codecs = fakeCodecs({})
    const r = await compressToTarget(
      blank(1000, 1000),
      source({ mimeType: 'image/png' }),
      req({ format: 'png' }),
      codecs,
    )
    expect(codecs.calls.map((c) => c.colors)).toEqual([256, 128])
    expect(r).toMatchObject({
      status: 'achieved',
      colors: 128,
      quality: null,
      mimeType: 'image/png',
    })
  })
  it('256 色符合時再試無損；無損也符合就用無損（畫質較好），colors 為 null', async () => {
    const codecs = fakeCodecs({})
    const r = await compressToTarget(
      blank(100, 100),
      source({ mimeType: 'image/png' }),
      req({ format: 'png' }),
      codecs,
    )
    expect(codecs.calls.map((c) => c.colors)).toEqual([256, null])
    expect(r.colors).toBeNull()
    expect(r.status).toBe('achieved')
  })
  it('64 色仍不符合 → 縮尺寸', async () => {
    const codecs = fakeCodecs({})
    const r = await compressToTarget(
      blank(1000, 1000),
      source(),
      req({ format: 'png', targetBytes: 400 * KB }),
      codecs,
    )
    expect(codecs.calls[0]!.colors).toBe(256)
    expect(r.status).toBe('achieved')
    expect(r.width).toBeLessThan(1000)
  })
  it('256 色不符合時完全不試無損（包含縮尺寸後的輪次）', async () => {
    const codecs = fakeCodecs({})
    await compressToTarget(
      blank(1000, 1000),
      source(),
      req({ format: 'png', targetBytes: 400 * KB }),
      codecs,
    )
    const later = codecs.calls.filter((c) => c.width < 1000)
    expect(later.length).toBeGreaterThan(0)
    expect(codecs.calls.filter((c) => c.colors === null && c.width === 1000)).toEqual([])
  })
  it('量化結果超過目標 2 倍時，不再試更少色數，直接縮尺寸（減色最多省 25–40%，追不上）', async () => {
    // 256 色 = 1.5 bytes/px；1000×1000 → 1.5 MB，目標 400 KB 的 3.7 倍
    const codecs = fakeCodecs({})
    await compressToTarget(
      blank(1000, 1000),
      source(),
      req({ format: 'png', targetBytes: 400 * KB }),
      codecs,
    )
    const firstScale = codecs.calls.filter((c) => c.width === 1000)
    expect(firstScale.map((c) => c.colors)).toEqual([256])
  })
  it('接近目標（2 倍內）時仍會往下試更少色數', async () => {
    const codecs = fakeCodecs({})
    // 1000×1000：256 色 1.5 MB、128 色 1.0 MB、目標 1 MB → 256 色在 2 倍內，應繼續試 128
    await compressToTarget(blank(1000, 1000), source(), req({ format: 'png' }), codecs)
    expect(codecs.calls.map((c) => c.colors)).toEqual([256, 128])
  })
  it('auto + 透明 → PNG，保留透明', async () => {
    const r = await compressToTarget(
      transparent(100, 80),
      source({ hasAlpha: true, mimeType: 'image/png' }),
      req(),
      fakeCodecs({}),
    )
    expect(r.mimeType).toBe('image/png')
    expect(r.warnings).not.toContain('alpha-flattened')
  })
})

describe('compressToTarget：警告', () => {
  it('JPEG + 透明 → 鋪白底並警告', async () => {
    const r = await compressToTarget(
      transparent(100, 80),
      source({ hasAlpha: true }),
      req({ format: 'jpeg' }),
      fakeCodecs({}),
    )
    expect(r.warnings).toContain('alpha-flattened')
  })
  it('WebP + 透明 → 不需要鋪底', async () => {
    const r = await compressToTarget(
      transparent(100, 80),
      source({ hasAlpha: true }),
      req({ format: 'webp' }),
      fakeCodecs({}),
    )
    expect(r.warnings).not.toContain('alpha-flattened')
    expect(r.mimeType).toBe('image/webp')
  })
  it('動畫 → animation-dropped', async () => {
    const r = await compressToTarget(
      blank(100, 100),
      source({ isAnimated: true, mimeType: 'image/gif' }),
      req(),
      fakeCodecs({}),
    )
    expect(r.warnings).toContain('animation-dropped')
  })
})

describe('compressToTarget：original-fits', () => {
  const small = new Uint8Array(1000)
  it('原圖已符合、格式 auto、重新編碼更大 → 回傳原圖', async () => {
    const r = await compressToTarget(
      blank(100, 100),
      source({ byteSize: 1000 }, small),
      req(),
      fakeCodecs({}),
    )
    expect(r.status).toBe('original-fits')
    expect(r.bytes).toBe(small)
    expect(r.mimeType).toBe('image/jpeg')
    expect([r.width, r.height]).toEqual([1000, 1000])
  })
  it('原圖已符合、格式與原圖相同 → 同樣回傳原圖', async () => {
    const r = await compressToTarget(
      blank(100, 100),
      source({ byteSize: 1000 }, small),
      req({ format: 'jpeg' }),
      fakeCodecs({}),
    )
    expect(r.status).toBe('original-fits')
  })
  it('使用者指定不同格式 → 不使用原圖', async () => {
    const r = await compressToTarget(
      blank(100, 100),
      source({ byteSize: 1000 }, small),
      req({ format: 'webp' }),
      fakeCodecs({}),
    )
    expect(r.status).toBe('achieved')
    expect(r.mimeType).toBe('image/webp')
  })
  it('重新編碼比原圖小 → 用重新編碼的結果', async () => {
    const big = new Uint8Array(900 * KB)
    const r = await compressToTarget(
      blank(100, 100),
      source({ byteSize: big.length }, big),
      req(),
      fakeCodecs({}),
    )
    expect(r.status).toBe('achieved')
    expect(r.bytes.length).toBeLessThan(big.length)
  })
})

describe('compressToTarget：取消', () => {
  it('isCancelled 為 true → CancelledError', async () => {
    await expect(
      compressToTarget(blank(100, 100), source(), req(), fakeCodecs({}), {
        isCancelled: () => true,
      }),
    ).rejects.toBeInstanceOf(CancelledError)
  })
  it('PNG 路徑也會檢查取消', async () => {
    let n = 0
    await expect(
      compressToTarget(blank(1000, 1000), source(), req({ format: 'png' }), fakeCodecs({}), {
        isCancelled: () => ++n > 1,
      }),
    ).rejects.toBeInstanceOf(CancelledError)
  })
})

// spec 007：編輯後重新壓縮時，從上一次結果的縮放比例開始，不再白做注定失敗的大尺寸嘗試
describe('compressToTarget：startScale', () => {
  const big = () => blank(2000, 2000)
  it('從 startScale 開始：不再嘗試原尺寸，結果與完整流程相同且不超標', async () => {
    const full = fakeCodecs({})
    const r1 = await compressToTarget(big(), source(), req(), full, { allowOriginal: false })
    expect(r1.status).toBe('achieved')
    expect(r1.width).toBeLessThan(2000)
    const fullSizeTries = full.calls.filter((c) => c.kind === 'encode' && c.width === 2000)
    expect(fullSizeTries.length).toBeGreaterThan(0)

    const warm = fakeCodecs({})
    const r2 = await compressToTarget(big(), source(), req(), warm, {
      allowOriginal: false,
      startScale: r1.width / 2000,
    })
    expect(warm.calls.filter((c) => c.kind === 'encode' && c.width === 2000)).toHaveLength(0)
    expect(r2.status).toBe('achieved')
    expect(r2.bytes.length).toBeLessThanOrEqual(MB)
    expect([r2.width, r2.height]).toEqual([r1.width, r1.height])
    expect(warm.calls.length).toBeLessThan(full.calls.length)
  })
  it('startScale 的尺寸仍不符合時，繼續縮小直到符合', async () => {
    const c = fakeCodecs({})
    const r = await compressToTarget(big(), source(), req(), c, {
      allowOriginal: false,
      startScale: 0.95,
    })
    expect(r.status).toBe('achieved')
    expect(r.bytes.length).toBeLessThanOrEqual(MB)
  })
  it.each([1, 1.5, 0, -1, Number.NaN])('startScale=%s 不合理時忽略，從原尺寸開始', async (s) => {
    const c = fakeCodecs({})
    await compressToTarget(big(), source(), req(), c, { allowOriginal: false, startScale: s })
    expect(c.calls[0]).toMatchObject({ kind: 'encode', width: 2000 })
  })
})
