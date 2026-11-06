import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'

// 元件測試：在真實的 Chromium 裡跑，指標與鍵盤事件才可信（research 002 R5）
export default defineConfig({
  plugins: [react()],
  // 這些依賴在 worker 裡才被發現；沒有預先打包時，Vite 會在測試中途重新載入，
  // 冷快取的 CI 上會讓測試檔載入失敗（2026-11-07 PR #1 的 CI 遇到）
  optimizeDeps: {
    include: [
      '@jsquash/jpeg/encode.js',
      '@jsquash/oxipng/optimise.js',
      '@jsquash/webp/encode.js',
      'image-q',
    ],
  },
  test: {
    include: ['test/components/**/*.test.tsx'],
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser: 'chromium' }],
    },
  },
})
