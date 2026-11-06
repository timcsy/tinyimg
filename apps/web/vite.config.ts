import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/tinyimg/',
  plugins: [react()],
  worker: { format: 'es' },
  build: { manifest: true, target: 'es2022' },
})
