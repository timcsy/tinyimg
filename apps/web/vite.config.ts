import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/tinyimg/',
  plugins: [react()],
  worker: { format: 'es' },
  build: { manifest: true, target: 'es2022' },
})
