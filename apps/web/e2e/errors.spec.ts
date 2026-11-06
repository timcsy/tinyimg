import { expect, test } from '@playwright/test'
import { choose } from './helpers'

test.beforeEach(async ({ page }) => page.goto('./'))

test('非圖片顯示錯誤', async ({ page }) => {
  await choose(page, 'not-image.txt')
  await expect(page.getByTestId('error')).toContainText('不是圖片', { timeout: 30_000 })
})

test('損毀的圖片顯示錯誤，不會卡住', async ({ page }) => {
  await choose(page, 'corrupt.png')
  await expect(page.getByTestId('error')).toContainText('無法讀取', { timeout: 30_000 })
})

test('動畫 GIF 提示只保留第一幀', async ({ page }) => {
  await choose(page, 'anim.gif')
  await expect(page.getByTestId('warnings')).toContainText('第一幀', { timeout: 30_000 })
})
