import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { choose, fixture, waitForResult } from './helpers'

/** 等 service worker 啟用並接管頁面 */
async function controlled(page: Page) {
  await page.goto('./')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.reload()
  // 安裝時要預先快取數 MB 的編碼器，在高負載下需要較長的時間
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 30_000 })
    .toBe(true)
}

test('離線：第一次載入後斷網，仍可放入、壓縮、下載（SC-001） @serial', async ({
  page,
  context,
}) => {
  test.slow()
  await controlled(page)
  await context.setOffline(true)
  await page.reload()
  await choose(page, 'photo.jpg')
  await waitForResult(page)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '下載' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('photo_compressed.jpg')
  await context.setOffline(false)
})

test('manifest：可安裝、獨立視窗、接收分享的圖片', async ({ page }) => {
  const res = await page.request.get('./manifest.webmanifest')
  expect(res.ok()).toBe(true)
  const m = await res.json()
  expect(m).toMatchObject({ name: 'TinyImg', display: 'standalone', start_url: './' })
  expect(m.icons.map((i: { sizes: string }) => i.sizes)).toEqual(['192x192', '512x512'])
  expect(m.share_target).toMatchObject({
    action: './share',
    method: 'POST',
    enctype: 'multipart/form-data',
  })
})

async function share(
  page: Page,
  files: { name: string; type: string; path?: string; text?: string }[],
) {
  const payload = files.map((f) => ({
    name: f.name,
    type: f.type,
    b64: f.path
      ? readFileSync(f.path).toString('base64')
      : Buffer.from(f.text ?? '').toString('base64'),
  }))
  await page.evaluate(async (payload) => {
    const fd = new FormData()
    for (const f of payload)
      fd.append(
        'images',
        new File([Uint8Array.from(atob(f.b64), (c) => c.charCodeAt(0))], f.name, { type: f.type }),
      )
    await fetch('./share', { method: 'POST', body: fd })
  }, payload)
  await page.goto('./?share=1')
}

test('分享一張圖片 → 單張編輯器（US2）', async ({ page }) => {
  await controlled(page)
  await share(page, [{ name: 'photo.jpg', type: 'image/jpeg', path: fixture('photo.jpg') }])
  await expect(page.getByTestId('output-size')).toHaveText('2400 × 1600', { timeout: 30_000 })
  expect(new URL(page.url()).search).toBe('') // 讀取後清掉網址參數
})

test('分享兩張圖片 → 批次', async ({ page }) => {
  await controlled(page)
  await share(page, [
    { name: 'photo.jpg', type: 'image/jpeg', path: fixture('photo.jpg') },
    { name: 'small.png', type: 'image/png', path: fixture('small.png') },
  ])
  await expect(page.getByTestId('batch-progress')).toHaveText('全部完成：2 / 2', {
    timeout: 60_000,
  })
})

test('分享非圖片 → 明確的錯誤訊息', async ({ page }) => {
  await controlled(page)
  await share(page, [{ name: 'notes.txt', type: 'text/plain', text: 'hello' }])
  await expect(page.getByTestId('error')).toContainText('不是圖片', { timeout: 30_000 })
})
