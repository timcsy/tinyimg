import AxeBuilder from '@axe-core/playwright'
import { expect, run, test } from './fixtures'

test('截取可見區域：2 秒內在編輯器顯示，尺寸等於分頁可見區域（SC-001） @serial', async ({
  context,
  sw,
  site,
}) => {
  const t0 = Date.now()
  const editorPromise = context.waitForEvent('page')
  await run(sw, 'captureVisible')
  const editor = await editorPromise
  await expect(editor.getByTestId('output-size')).toHaveText('1000 × 700', { timeout: 10_000 })
  const elapsed = Date.now() - t0
  console.log(`004 SC-001 elapsed=${elapsed}ms`)
  expect(elapsed).toBeLessThanOrEqual(process.env.CI ? 6000 : 2000)
  void site
})

test('框選區域：只截取選取的範圍；之後頁面上沒有殘留遮罩', async ({ context, sw, site }) => {
  const editorPromise = context.waitForEvent('page')
  const done = run(sw, 'captureRegion', false)
  const overlay = site.locator('[data-tinyimg-overlay]')
  await expect(overlay).toBeVisible()
  await site.mouse.move(100, 100)
  await site.mouse.down()
  await site.mouse.move(300, 250, { steps: 5 })
  await site.mouse.up()
  await done
  await expect(overlay).toHaveCount(0)
  const editor = await editorPromise
  await expect(editor.getByTestId('output-size')).toHaveText('200 × 150', { timeout: 10_000 })
})

test('框選時按 Esc 取消：沒有開啟編輯器，也沒有殘留遮罩', async ({ context, sw, site }) => {
  const pagesBefore = context.pages().length
  const done = run(sw, 'captureRegion', false)
  await expect(site.locator('[data-tinyimg-overlay]')).toBeVisible()
  await site.keyboard.press('Escape')
  await done
  await expect(site.locator('[data-tinyimg-overlay]')).toHaveCount(0)
  expect(context.pages().length).toBe(pagesBefore)
})

test('截圖 → 畫箭頭 → ⌘C 複製（SC-002）', async ({ context, sw, site }) => {
  const editorPromise = context.waitForEvent('page')
  await run(sw, 'captureVisible')
  const editor = await editorPromise
  await expect(editor.getByTestId('result-status')).toBeVisible({ timeout: 30_000 })
  await editor.keyboard.press('a')
  const box = (await editor.getByTestId('annotation-surface').boundingBox())!
  await editor.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2)
  await editor.mouse.down()
  await editor.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.3, { steps: 4 })
  await editor.mouse.up()
  await expect(editor.getByRole('button', { name: '箭頭 1，紅色' })).toBeAttached()
  await editor.locator('body').click({ position: { x: 1, y: 1 } })
  await editor.keyboard.press(`${process.platform === 'darwin' ? 'Meta' : 'Control'}+c`)
  await expect(editor.getByRole('status')).toContainText('已複製', { timeout: 30_000 })
  void site
})

test('無法截圖的頁面會顯示明確訊息', async ({ context, sw, site }) => {
  await site.goto('chrome://version/')
  const editorPromise = context.waitForEvent('page')
  await run(sw, 'captureVisible')
  const editor = await editorPromise
  await expect(editor.getByTestId('ext-notice')).toContainText('無法截圖')
})

test('右鍵「用 TinyImg 編輯」：同網域與跨網域圖片都能開啟（US2）', async ({
  context,
  sw,
  site,
}) => {
  for (const [id, src] of [
    ['same', 'http://site.test/pic.png'],
    ['cross', 'http://cdn.test/pic.png'],
  ] as const) {
    const editorPromise = context.waitForEvent('page')
    await sw.evaluate(async (src) => {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
      ;(
        globalThis as unknown as { tinyimg: { editImage: (t: chrome.tabs.Tab, s: string) => void } }
      ).tinyimg.editImage(tab!, src)
    }, src)
    const editor = await editorPromise
    await expect(editor.getByTestId('output-size'), id).toHaveText('128 × 128', { timeout: 10_000 })
    await editor.close()
  }
  void site
})

test('讀不到的圖片顯示錯誤訊息', async ({ context, sw, site }) => {
  await context.route('http://site.test/missing.png', (r) => r.fulfill({ status: 404, body: '' }))
  const editorPromise = context.waitForEvent('page')
  await sw.evaluate(async () => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
    ;(
      globalThis as unknown as { tinyimg: { editImage: (t: chrome.tabs.Tab, s: string) => void } }
    ).tinyimg.editImage(tab!, 'http://site.test/missing.png')
  })
  const editor = await editorPromise
  await expect(editor.getByTestId('ext-notice')).toContainText('無法讀取這張圖片')
  void site
})

test('編輯器頁面通過無障礙檢查（SC-007）', async ({ context, sw, site }) => {
  const editorPromise = context.waitForEvent('page')
  await run(sw, 'captureVisible')
  const editor = await editorPromise
  await expect(editor.getByTestId('result-status')).toBeVisible({ timeout: 30_000 })
  const r = await new AxeBuilder({ page: editor })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(r.violations).toEqual([])
  void site
})

// 側邊欄開不起來（例如沒有使用者手勢）時，不能什麼都不做：截圖完成後改用新分頁開啟（原則 2：做不到就明說）。
// 也涵蓋 CI 上的競態：設定還沒生效時，背景以為要開側邊欄（2026-11-07 PR #1 的 CI 發現）
test('側邊欄開不起來時改用新分頁開啟編輯器，截到的仍是原本的頁面', async ({
  context,
  sw,
  site,
}) => {
  await sw.evaluate(() => chrome.storage.local.set({ settings: { openIn: 'sidepanel' } }))
  await expect
    .poll(() =>
      sw.evaluate(
        async () =>
          ((await chrome.storage.local.get('settings')).settings as { openIn?: string } | undefined)
            ?.openIn,
      ),
    )
    .toBe('sidepanel')
  const editorPromise = context.waitForEvent('page')
  await run(sw, 'captureVisible') // 從 service worker 直接呼叫：沒有使用者手勢，sidePanel.open 會失敗
  const editor = await editorPromise
  await expect(editor.getByTestId('output-size')).toHaveText('1000 × 700', { timeout: 10_000 })
  void site
})
