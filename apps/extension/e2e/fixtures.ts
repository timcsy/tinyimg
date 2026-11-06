import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  test as base,
  chromium,
  type BrowserContext,
  type Page,
  type Worker,
} from '@playwright/test'

const DIST = join(dirname(fileURLToPath(import.meta.url)), '../dist-e2e')
export const PIC = readFileSync(join(DIST, 'icon-128.png'))

/** 測試網站：http://site.test（頁面與同網域圖片）、http://cdn.test（跨網域圖片） */
export const PAGE_HTML = `<!doctype html><html><head><style>
  html,body{margin:0;background:#3366cc} img{display:block}
</style></head><body><img id="same" src="http://site.test/pic.png"><img id="cross" src="http://cdn.test/pic.png"></body></html>`

export const test = base.extend<{ context: BrowserContext; sw: Worker; site: Page }>({
  // Playwright 的 fixture 第一個參數必須是解構的物件（即使不使用任何 fixture）
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      viewport: { width: 1000, height: 700 },
      args: [`--disable-extensions-except=${DIST}`, `--load-extension=${DIST}`],
    })
    await context.route('http://site.test/**', (r) =>
      r.request().url().endsWith('.png')
        ? r.fulfill({ body: PIC, contentType: 'image/png' })
        : r.fulfill({ body: PAGE_HTML, contentType: 'text/html' }),
    )
    await context.route('http://cdn.test/**', (r) =>
      r.fulfill({ body: PIC, contentType: 'image/png' }),
    )
    await use(context)
    await context.close()
  },
  sw: async ({ context }, use) => {
    let [sw] = context.serviceWorkers()
    if (!sw) sw = await context.waitForEvent('serviceworker')
    // 自動化無法打開側邊欄（需要使用者操作），E2E 以「新分頁」開啟編輯器
    await sw.evaluate(() => chrome.storage.local.set({ settings: { openIn: 'tab' } }))
    await use(sw)
  },
  site: async ({ context }, use) => {
    const page = context.pages()[0] ?? (await context.newPage())
    await page.goto('http://site.test/')
    await use(page)
  },
})
export { expect } from '@playwright/test'

/** 透過 service worker 呼叫背景處理函式（原生選單與快捷鍵無法自動化；research 004 R6） */
export async function run(sw: Worker, fn: 'captureVisible' | 'captureRegion', wait = true) {
  const p = sw.evaluate(async (name) => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
    const api = (
      globalThis as unknown as { tinyimg: Record<string, (t: chrome.tabs.Tab) => Promise<void>> }
    ).tinyimg
    await api[name]!(tab!)
  }, fn)
  if (wait) await p
  return p
}
