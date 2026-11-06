import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  gifBytes,
  noise,
  photo,
  screenshot,
  transparent,
} from '../../../../packages/core/test/fixtures/generate'
import { initWasmForNode } from '../../../../packages/core/test/setup-wasm'
import { encodeJpeg, encodePng } from '../../../../packages/core/src/codecs/wasm'

export const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'generated')

/** 用 core 的確定性產生器輸出 E2E 測試圖片（不進版本控制） */
export default async function globalSetup() {
  if (existsSync(join(FIXTURES, 'done-v4'))) return
  mkdirSync(FIXTURES, { recursive: true })
  await initWasmForNode()
  writeFileSync(join(FIXTURES, 'photo.jpg'), await encodeJpeg(photo(2400, 1600, 11), 0.95))
  writeFileSync(join(FIXTURES, 'screenshot.png'), await encodePng(screenshot(1920, 1080, 12), null))
  writeFileSync(join(FIXTURES, 'transparent.png'), await encodePng(transparent(400, 300), null))
  writeFileSync(join(FIXTURES, 'small.png'), await encodePng(transparent(40, 30), null))
  writeFileSync(join(FIXTURES, 'noise.png'), await encodePng(noise(1200, 1200), null))
  // SC-003：約 12 百萬像素的照片
  writeFileSync(join(FIXTURES, 'photo-12mp.jpg'), await encodeJpeg(photo(4240, 2832, 13), 0.92))
  // 003：黑白棋盤格（每格 2 px），用來驗證馬賽克真的破壞像素
  {
    const w = 400
    const h = 300
    const data = new Uint8ClampedArray(w * h * 4)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const v = (Math.floor(x / 2) + Math.floor(y / 2)) % 2 ? 255 : 0
        data.set([v, v, v, 255], (y * w + x) * 4)
      }
    writeFileSync(
      join(FIXTURES, 'checker.png'),
      await encodePng({ width: w, height: h, data }, null),
    )
  }
  writeFileSync(join(FIXTURES, 'anim.gif'), gifBytes(2))
  writeFileSync(join(FIXTURES, 'not-image.txt'), 'hello')
  writeFileSync(
    join(FIXTURES, 'corrupt.png'),
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4, 5]),
  )
  writeFileSync(join(FIXTURES, 'done-v4'), '')
}
