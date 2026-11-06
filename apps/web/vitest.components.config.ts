import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'

// 元件測試：在真實的 Chromium 裡跑，指標與鍵盤事件才可信（research 002 R5）
export default defineConfig({
  plugins: [react()],
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
