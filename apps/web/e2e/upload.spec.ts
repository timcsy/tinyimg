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
  await page.getByLabel('目標大小（KB）').fill('300')
  await expect(page.getByTestId('result-size')).toBeVisible()
  const before = await page.getByTestId('result-size').textContent()
  await page.getByLabel('目標大小（KB）').fill('1024')
  await choose(page, 'photo.jpg')
  await expect(page.getByTestId('result-size')).not.toHaveText(before ?? '', { timeout: 30_000 })
})
