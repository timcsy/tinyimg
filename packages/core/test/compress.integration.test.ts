import { beforeAll, describe, expect, it } from 'vitest'
import { hasAlpha } from '../src/analyze'
import { compressToTarget } from '../src/compress'
import { wasmCodecs } from '../src/codecs/wasm'
import type { RawImage } from '../src/types'
import { photo, screenshot, transparent } from './fixtures/generate'
import { initWasmForNode } from './setup-wasm'

beforeAll(initWasmForNode)

const KB = 1024
const fixtures: [string, () => RawImage][] = [
  ['photo', () => photo(1600, 1067, 7)],
  ['screenshot', () => screenshot(1920, 1080, 3)],
  ['transparent', () => transparent(800, 600)],
]

// SC-001：不會靜默超標
describe.each(fixtures)('%s（真實編碼器）', (_name, make) => {
  const img = make()
  const source = {
    name: 'x',
    mimeType: 'image/png',
    byteSize: img.data.length,
    width: img.width,
    height: img.height,
    hasAlpha: hasAlpha(img),
    isAnimated: false,
    bytes: new Uint8Array(img.data.length),
  }
  it.each([
    [50 * KB, 'auto'],
    [1024 * KB, 'auto'],
    [100 * KB, 'webp'],
    [200 * KB, 'jpeg'],
  ] as const)('target=%i format=%s', async (targetBytes, format) => {
    const r = await compressToTarget(
      img,
      source,
      { id: 1, targetBytes, maxQuality: 0.8, format },
      wasmCodecs,
    )
    if (r.status === 'unreachable') expect(r.bytes.length).toBeGreaterThan(targetBytes)
    else expect(r.bytes.length).toBeLessThanOrEqual(targetBytes)
    expect(r.bytes.length).toBeGreaterThan(0)
  })
})

it('JPEG 輸出是有效的 JPEG（SOI 標記）', async () => {
  const img = photo(400, 300, 2)
  const r = await compressToTarget(
    img,
    {
      name: 'x',
      mimeType: 'image/png',
      byteSize: 1e7,
      width: 400,
      height: 300,
      hasAlpha: false,
      isAnimated: false,
      bytes: new Uint8Array(1),
    },
    { id: 1, targetBytes: 1024 * KB, maxQuality: 0.8, format: 'jpeg' },
    wasmCodecs,
  )
  expect([r.bytes[0], r.bytes[1]]).toEqual([0xff, 0xd8])
})
