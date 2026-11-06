import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { choose, waitForResult } from './helpers'

test('初始狀態無障礙零違規', async ({ page }) => {
  await page.goto('./')
  const r = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(r.violations).toEqual([])
})

test('有結果時無障礙零違規', async ({ page }) => {
  await page.goto('./')
  await choose(page, 'photo.jpg')
  await waitForResult(page)
  const r = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(r.violations).toEqual([])
})

test('暗色模式也零違規，且背景會改變', async ({ page }) => {
  await page.goto('./')
  const light = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  await page.emulateMedia({ colorScheme: 'dark' })
  const dark = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(dark).not.toBe(light)
  const r = await new AxeBuilder({ page }).withTags(['wcag2aa']).analyze()
  expect(r.violations).toEqual([])
})

test('鍵盤可以開啟檔案選擇', async ({ page }) => {
  await page.goto('./')
  const zone = page.getByRole('button', { name: /選擇或拖曳圖片/ })
  await zone.focus()
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.keyboard.press('Enter'),
  ])
  expect(chooser).toBeTruthy()
})

test('360px 寬沒有水平捲軸', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  await page.goto('./')
  await choose(page, 'photo.jpg')
  await waitForResult(page)
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  )
  expect(overflow).toBe(false)
})
