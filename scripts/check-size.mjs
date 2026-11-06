#!/usr/bin/env node
// 首次載入 JS 預算檢查（憲章 IV、SC-008）：
// 入口 chunk 加上它的靜態 import（遞迴），gzip 後加總；不含動態 import 與 .wasm。
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const dist = process.argv[2] ?? 'apps/web/dist'
const budget = Number(process.argv[3] ?? 200 * 1024)
const manifestPath = join(dist, '.vite/manifest.json')

if (!existsSync(manifestPath)) {
  console.error(
    `找不到 ${manifestPath}。請先執行 npm run build（vite build 需開啟 build.manifest）。`,
  )
  process.exit(1)
}
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const seen = new Set()
const files = []
const visit = (key) => {
  if (seen.has(key)) return
  seen.add(key)
  const chunk = manifest[key]
  if (!chunk) return
  if (chunk.file.endsWith('.js')) files.push(chunk.file)
  for (const k of chunk.imports ?? []) visit(k)
}
for (const [key, chunk] of Object.entries(manifest)) if (chunk.isEntry) visit(key)

let total = 0
for (const f of files) {
  const size = gzipSync(readFileSync(join(dist, f))).length
  total += size
  console.log(`  ${f}: ${(size / 1024).toFixed(1)} KB (gzip)`)
}
const kb = (n) => `${(n / 1024).toFixed(1)} KB`
if (total > budget) {
  console.error(`首次載入 JS 為 ${kb(total)}，超過預算 ${kb(budget)}。`)
  process.exit(1)
}
console.log(`首次載入 JS：${kb(total)} / 預算 ${kb(budget)}`)
