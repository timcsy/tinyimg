import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/tinyimg/',
  plugins: [react()],
  worker: { format: 'es' },
  build: { manifest: true, target: 'es2022' },
  test: { include: ['test/*.test.ts'], environment: 'node' },
})
