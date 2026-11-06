import { defineConfig } from '@playwright/test'

// 外掛 E2E：只有 Chromium 能載入外掛；每個測試用自己的 persistent context（見 e2e/fixtures.ts）
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  workers: 2,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { trace: 'retain-on-failure' },
})
