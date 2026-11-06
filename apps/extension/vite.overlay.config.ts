import { defineConfig } from 'vite'

// 框選遮罩是內容腳本，不能是 ES 模組：另外以 IIFE 建置（research 004 R2）
export default defineConfig({
  publicDir: false,
  build: {
    outDir: process.env.TINYIMG_E2E === '1' ? 'dist-e2e' : 'dist',
    emptyOutDir: false,
    target: 'es2022',
    lib: {
      entry: 'src/overlay.ts',
      formats: ['iife'],
      name: 'TinyImgOverlay',
      fileName: () => 'overlay.js',
    },
  },
})
