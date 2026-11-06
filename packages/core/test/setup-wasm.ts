import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

/** Node 沒有 ImageData；jSquash 用 instanceof 判斷，所以提供最小 polyfill 並預先載入 WASM */
class NodeImageData {
  constructor(
    public data: Uint8ClampedArray,
    public width: number,
    public height: number,
  ) {}
}

export async function initWasmForNode(): Promise<void> {
  const g = globalThis as { ImageData?: unknown }
  g.ImageData ??= NodeImageData
  const require = createRequire(import.meta.url)
  const mod = (f: string) => new WebAssembly.Module(readFileSync(require.resolve(f)))
  const jpeg = await import('@jsquash/jpeg/encode.js')
  const webp = await import('@jsquash/webp/encode.js')
  const ox = await import('@jsquash/oxipng/optimise.js')
  await jpeg.init(mod('@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm'))
  await webp.init(mod('@jsquash/webp/codec/enc/webp_enc_simd.wasm'))
  await ox.init(readFileSync(require.resolve('@jsquash/oxipng/codec/pkg/squoosh_oxipng_bg.wasm')))
}
