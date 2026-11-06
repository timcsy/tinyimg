import { expect, test } from '@playwright/test'
import { choose, drop, paste, waitForResult } from './helpers'

test.beforeEach(async ({ page }) => page.goto('./'))

test('選擇檔案', async ({ page }) => {
  await choose(page, 'photo.jpg')
  await waitForResult(page)
  await expect(page.getByTestId('result-status')).toHaveText('已達成目標')
})

test('拖曳', async ({ page }) => {
  await drop(page, 'screenshot.png')
  await waitForResult(page)
})

test('貼上', async ({ page }) => {
  await paste(page, 'photo.jpg')
  await waitForResult(page)
})

test('連續選擇同一個檔案兩次都會處理', async ({ page }) => {
  await choose(page, 'photo.jpg')
  await waitForResult(page)
  const img = page.getByAltText('壓縮後')
  const first = await img.getAttribute('src')
  await choose(page, 'photo.jpg')
  await expect(img).not.toHaveAttribute('src', first ?? '', { timeout: 30_000 })
  await waitForResult(page)
})
