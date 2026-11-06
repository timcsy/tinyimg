import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  gifBytes,
  photo,
  screenshot,
  transparent,
} from '../../../../packages/core/test/fixtures/generate'
import { initWasmForNode } from '../../../../packages/core/test/setup-wasm'
import { encodeJpeg, encodePng } from '../../../../packages/core/src/codecs/wasm'

export const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'generated')

/** 用 core 的確定性產生器輸出 E2E 測試圖片（不進版本控制） */
export default async function globalSetup() {
  if (existsSync(join(FIXTURES, 'done'))) return
  mkdirSync(FIXTURES, { recursive: true })
  await initWasmForNode()
  writeFileSync(join(FIXTURES, 'photo.jpg'), await encodeJpeg(photo(2400, 1600, 11), 0.95))
  writeFileSync(join(FIXTURES, 'screenshot.png'), await encodePng(screenshot(1920, 1080, 12), null))
  writeFileSync(join(FIXTURES, 'transparent.png'), await encodePng(transparent(400, 300), null))
  writeFileSync(join(FIXTURES, 'small.png'), await encodePng(transparent(40, 30), null))
  writeFileSync(join(FIXTURES, 'anim.gif'), gifBytes(2))
  writeFileSync(join(FIXTURES, 'not-image.txt'), 'hello')
  writeFileSync(
    join(FIXTURES, 'corrupt.png'),
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4, 5]),
  )
  writeFileSync(join(FIXTURES, 'done'), '')
}
