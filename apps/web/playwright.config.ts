import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/fixtures/global-setup.ts',
  timeout: 60_000,
  fullyParallel: true,
  // 限制平行數：壓縮是 CPU 密集工作，過多 worker 互搶 CPU 會讓逾時類測試失真（CI 機器為 4 核）。
  // 標記 @serial 的測試（效能量測、最壞情況）另外以單一 worker 執行，見 package.json 的 e2e script。
  workers: 4,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173/tinyimg/',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], permissions: ['clipboard-read', 'clipboard-write'] },
    },
    // 憲章：網頁版支援 Chrome、Edge、Firefox、Safari 最近兩個主要版本
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173/tinyimg/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
