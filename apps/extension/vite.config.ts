import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { buildManifest } from './src/lib/manifest'

const E2E = process.env.TINYIMG_E2E === '1'

// 外掛建置（research 004 R2）：editor.html 與 background（ES 模組 service worker），並輸出 manifest.json
export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      name: 'tinyimg-manifest',
      generateBundle() {
        const manifest = buildManifest(process.env.TINYIMG_VERSION ?? 'v0.1.0', { e2e: E2E })
        this.emitFile({
          type: 'asset',
          fileName: 'manifest.json',
          source: JSON.stringify(manifest, null, 2),
        })
      },
    },
  ],
  worker: { format: 'es' },
  build: {
    outDir: E2E ? 'dist-e2e' : 'dist',
    emptyOutDir: true,
    target: 'es2022',
    rollupOptions: {
      input: { editor: 'editor.html', background: 'src/background.ts' },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js',
      },
    },
  },
})
