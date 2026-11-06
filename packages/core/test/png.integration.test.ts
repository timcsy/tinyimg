import { beforeAll, expect, it } from 'vitest'
import { encodePng } from '../src/codecs/wasm'
import { compressToTarget } from '../src/compress'
import { screenshot } from './fixtures/generate'
import { initWasmForNode } from './setup-wasm'

beforeAll(initWasmForNode)

const SIZES: [number, number][] = [
  [1920, 1080],
  [2560, 1440],
  [2880, 1800],
  [1920, 1200],
  [2048, 1536],
  [1920, 1080],
  [2560, 1600],
  [2880, 1800],
  [1680, 1050],
  [2560, 1440],
]

// SC-002：PNG 截圖在 1 MB、auto 時至少 90% 達成
it('10 張截圖至少 9 張在 1 MB 內達成', async () => {
  let achieved = 0
  let neededWork = 0
  for (const [i, [w, h]] of SIZES.entries()) {
    const img = screenshot(w, h, 100 + i)
    const r = await compressToTarget(
      img,
      {
        name: 's.png',
        mimeType: 'image/png',
        byteSize: 5e6,
        width: w,
        height: h,
        hasAlpha: false,
        isAnimated: false,
        bytes: new Uint8Array(1),
      },
      { id: 1, targetBytes: 1024 * 1024, maxQuality: 0.8, format: 'png' },
      { encode: () => Promise.reject(new Error('不應使用有損編碼')), encodePng },
    )
    if (r.status === 'achieved') achieved++
    if (r.colors !== null || r.width < w) neededWork++
  }
  expect(achieved).toBeGreaterThanOrEqual(9)
  // 測試要有鑑別力：多數截圖無損時超過 1 MB，必須靠量化或縮尺寸（舊版在此全部失敗）
  expect(neededWork).toBeGreaterThanOrEqual(5)
  // 10 張 2–5 MP 截圖的量化很吃 CPU；在高負載的機器上會超過預設的 120 秒。
  // 放寬的是測試時限，不是 SC-002 的驗收標準（達成率）
}, 300_000)

// 教訓 A：要驗證參數真的會改變輸出
it('量化色數越少，PNG 越小', async () => {
  const img = screenshot(800, 600, 5)
  const lossless = await encodePng(img, null)
  const q64 = await encodePng(img, 64)
  expect(q64.length).toBeLessThan(lossless.length)
  expect([q64[0], q64[1], q64[2], q64[3]]).toEqual([0x89, 0x50, 0x4e, 0x47])
})
