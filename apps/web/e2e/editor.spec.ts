import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { choose, paste, waitForResult } from './helpers'

const outputSize = (page: Page) => page.getByTestId('output-size')
const MOD = process.platform === 'darwin' ? 'Meta' : 'Control'

async function ready(page: Page, name = 'photo.jpg') {
  await page.goto('./')
  await choose(page, name)
  await waitForResult(page)
  await expect(outputSize(page)).toBeVisible()
}

test.describe('US2：非破壞式編輯', () => {
  test('旋轉後寬高互換，壓縮結果的尺寸也跟著變', async ({ page }) => {
    await ready(page) // photo.jpg 為 2400×1600
    await expect(outputSize(page)).toHaveText('2400 × 1600')
    await page.getByRole('button', { name: '順時針旋轉' }).click()
    await expect(outputSize(page)).toHaveText('1600 × 2400')
    await expect(page.getByTestId('result-meta')).toContainText('1600×2400', { timeout: 30_000 })
  })

  test('裁切：預設全圖，選 1:1 後套用為正方形', async ({ page }) => {
    await ready(page)
    await page.getByRole('button', { name: '裁切' }).click()
    await page.getByLabel('裁切比例').selectOption('1:1')
    await page.getByRole('button', { name: '套用裁切' }).click()
    await expect(outputSize(page)).toHaveText('1600 × 1600')
    await expect(page.getByTestId('result-meta')).toContainText('1600×1600', { timeout: 30_000 })
  })

  test('復原與重做；全部還原之後也能復原', async ({ page }) => {
    await ready(page)
    await page.getByRole('button', { name: '順時針旋轉' }).click()
    await page.getByRole('button', { name: '水平翻轉' }).click()
    await page.getByRole('button', { name: '全部還原' }).click()
    await expect(outputSize(page)).toHaveText('2400 × 1600')
    await page.getByRole('button', { name: '復原' }).click()
    await expect(outputSize(page)).toHaveText('1600 × 2400')
    await page.getByRole('button', { name: '復原' }).click()
    await page.getByRole('button', { name: '復原' }).click()
    await expect(outputSize(page)).toHaveText('2400 × 1600')
    await expect(page.getByRole('button', { name: '復原' })).toBeDisabled()
    await page.getByRole('button', { name: '重做' }).click()
    await expect(outputSize(page)).toHaveText('1600 × 2400')
  })

  test('調整尺寸為 50%', async ({ page }) => {
    await ready(page)
    await page.getByRole('button', { name: '調整尺寸' }).click()
    const dialog = page.getByRole('dialog', { name: '調整尺寸' })
    await dialog.getByRole('button', { name: '50%' }).click()
    await dialog.getByRole('button', { name: '套用' }).click()
    await expect(outputSize(page)).toHaveText('1200 × 800')
    await expect(page.getByTestId('result-meta')).toContainText('1200×800', { timeout: 30_000 })
  })

  test('編輯後即使原圖已符合目標，也不會回傳未編輯的原始檔', async ({ page }) => {
    await ready(page, 'small.png')
    await page.getByRole('button', { name: '水平翻轉' }).click()
    await expect(page.getByTestId('result-status')).not.toHaveText('原圖已符合目標', {
      timeout: 30_000,
    })
  })
})

test.describe('US1：兩個操作完成「壓縮後上傳」', () => {
  test('貼上 → ⌘C，剪貼簿拿到 PNG（SC-001）', async ({ page, browserName }) => {
    await page.goto('./')
    await paste(page, 'photo.jpg') // 操作 1
    await page.keyboard.press(`${MOD}+c`) // 操作 2（結果尚未完成也可以，會等結果）
    await expect(page.getByRole('status')).toContainText('已複製', { timeout: 30_000 })
    if (browserName !== 'chromium') return
    const types = await page.evaluate(
      async () => (await navigator.clipboard.read())[0]?.types ?? [],
    )
    expect(types).toContain('image/png')
  })

  test('⌘S 下載結果', async ({ page }) => {
    await ready(page)
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.keyboard.press(`${MOD}+s`),
    ])
    expect(download.suggestedFilename()).toBe('photo_compressed.jpg')
  })

  test('焦點在目標大小欄位時，⌘C 不會複製圖片', async ({ page }) => {
    await ready(page)
    await page.getByLabel('目標大小（KB）').focus()
    await page.keyboard.press(`${MOD}+c`)
    await expect(page.getByRole('status')).not.toContainText('已複製')
  })
})

test.describe('US3：鍵盤優先與對比', () => {
  test('只用鍵盤：裁切 → 旋轉 → 復原 → 對比 → 複製（SC-005）', async ({ page }) => {
    await ready(page)
    await page.locator('body').click({ position: { x: 1, y: 1 } })
    await page.keyboard.press('c')
    await expect(page.getByTestId('crop-box')).toBeVisible()
    await page.getByTestId('crop-box').focus()
    await page.keyboard.press('Alt+ArrowLeft')
    await page.keyboard.press('Enter')
    await expect(outputSize(page)).toHaveText('2399 × 1600')
    await page.keyboard.press('r')
    await expect(outputSize(page)).toHaveText('1600 × 2399')
    await page.keyboard.press(`${MOD}+z`)
    await expect(outputSize(page)).toHaveText('2399 × 1600')
    const slider = page.getByRole('slider', { name: '前後對比' })
    await slider.focus({ timeout: 30_000 })
    await page.keyboard.press('Home')
    await expect(slider).toHaveAttribute('aria-valuetext', /^0%/)
    await page.locator('body').click({ position: { x: 1, y: 1 } })
    await page.keyboard.press(`${MOD}+c`)
    await expect(page.getByRole('status')).toContainText('已複製', { timeout: 30_000 })
  })

  test('? 開啟快捷鍵說明，Esc 關閉', async ({ page }) => {
    await ready(page)
    await page.locator('body').click({ position: { x: 1, y: 1 } })
    await page.keyboard.press('Shift+?')
    await expect(page.getByRole('dialog', { name: '快捷鍵' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: '快捷鍵' })).toBeHidden()
  })

  for (const scheme of ['light', 'dark'] as const) {
    test(`編輯畫面無障礙零違規（${scheme}）`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme })
      await ready(page)
      await page.getByRole('button', { name: '裁切' }).click()
      const r = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze()
      expect(r.violations).toEqual([])
    })
  }

  test('360px 寬的編輯畫面沒有水平捲軸', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 })
    await ready(page)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    )
    expect(overflow).toBe(false)
  })
})
