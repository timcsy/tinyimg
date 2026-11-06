import { expect, test } from '@playwright/test'
import { choose, waitForResult } from './helpers'

test.beforeEach(async ({ page }) => page.goto('./'))

test('預設值', async ({ page }) => {
  await expect(page.getByLabel('品質上限')).toHaveValue('80')
  await expect(page.getByLabel('目標大小（KB）')).toHaveValue('1024')
  await expect(page.getByLabel('輸出格式')).toHaveValue('auto')
})

test('改設定後結果會更新', async ({ page }) => {
  await choose(page, 'photo.jpg')
  await waitForResult(page)
  const first = await page.getByTestId('result-size').textContent()
  await page.getByLabel('目標大小（KB）').fill('200')
  await expect(page.getByTestId('result-size')).not.toHaveText(first ?? '', { timeout: 30_000 })
  await page.getByLabel('輸出格式').selectOption('webp')
  await expect(page.getByTestId('result-meta')).toContainText('WEBP', { timeout: 30_000 })
})

test('目標大小不合法時顯示提示', async ({ page }) => {
  await page.getByLabel('目標大小（KB）').fill('0')
  await expect(page.getByRole('alert')).toContainText('50 到 10240')
})

test('無法達成時明確顯示，仍可下載 @serial', async ({ page }) => {
  await page.getByLabel('目標大小（KB）').fill('50')
  await page.getByLabel('輸出格式').selectOption('png')
  await choose(page, 'noise.png')
  await expect(page.getByTestId('result-status')).toContainText('無法達成目標', { timeout: 30_000 })
  await expect(page.getByRole('button', { name: '下載' })).toBeEnabled()
})
