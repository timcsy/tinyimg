import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  base: '/tinyimg/',
  plugins: [svelte()],
  worker: { format: 'es' },
  build: { manifest: true, target: 'es2022' },
  test: { include: ['test/**/*.test.ts'], environment: 'node' },
})
