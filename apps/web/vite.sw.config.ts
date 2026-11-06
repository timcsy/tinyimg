import { createHash } from 'node:crypto'
import { readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { defineConfig } from 'vite'
import { precacheList } from './src/sw-core'

// 第二次建置：在主程式建置之後，列出 dist 的檔案作為預先快取清單，把 sw.js 建成獨立的 IIFE（research 005 R1）
const dist = new URL('./dist', import.meta.url).pathname
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : [relative(dist, p)]
  })
const list = precacheList(walk(dist).sort())
const version = createHash('sha256').update(list.join('\n')).digest('hex').slice(0, 12)

export default defineConfig({
  publicDir: false,
  define: {
    __TINYIMG_PRECACHE__: JSON.stringify(list),
    __TINYIMG_VERSION__: JSON.stringify(version),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    target: 'es2022',
    lib: { entry: 'src/sw.ts', formats: ['iife'], name: 'TinyImgSW', fileName: () => 'sw.js' },
  },
})
