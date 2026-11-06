import { expect, test } from '@playwright/test'
import { choose, waitForResult } from './helpers'

test.beforeEach(async ({ page }) => page.goto('./'))

test('複製到剪貼簿會寫入 PNG', async ({ page }) => {
  await choose(page, 'photo.jpg')
  await waitForResult(page)
  await page.getByRole('button', { name: '複製到剪貼簿' }).click()
  await expect(page.getByRole('status')).toContainText('已複製', { timeout: 15_000 })
  const types = await page.evaluate(async () => (await navigator.clipboard.read())[0]?.types ?? [])
  expect(types).toContain('image/png')
})

test('下載檔名正確', async ({ page }) => {
  await choose(page, 'photo.jpg')
  await waitForResult(page)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '下載' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('photo_compressed.jpg')
})

test('透明圖選 JPEG 會提示透明度移除', async ({ page }) => {
  await page.getByLabel('輸出格式').selectOption('jpeg')
  await choose(page, 'transparent.png')
  await waitForResult(page)
  await expect(page.getByTestId('warnings')).toContainText('透明區域已填成白色')
})

test('小圖顯示原圖已符合目標', async ({ page }) => {
  await choose(page, 'small.png')
  await expect(page.getByTestId('result-status')).toHaveText(/原圖已符合目標|已達成目標/, {
    timeout: 30_000,
  })
  await expect(page.getByTestId('saving')).not.toContainText('-')
})
