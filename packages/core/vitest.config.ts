import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    testTimeout: 120_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // browser.ts 依賴 OffscreenCanvas、createImageBitmap，只能在瀏覽器執行，由 E2E 涵蓋
      exclude: ['src/codecs/browser.ts', 'src/worker-entry.ts'],
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 },
    },
  },
})
