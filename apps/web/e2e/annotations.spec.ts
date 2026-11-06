import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { choose, paste, waitForResult } from './helpers'

const MOD = process.platform === 'darwin' ? 'Meta' : 'Control'

// 畫布比預設視窗高；以比例座標操作時，整個畫布都必須在視窗內（滑鼠座標是相對於視窗的）
test.use({ viewport: { width: 1280, height: 1600 } })

/** 在註解層上，以「畫布寬高的比例」拖曳 */
async function dragOn(page: Page, from: [number, number], to: [number, number]) {
  const box = (await page.getByTestId('annotation-surface').boundingBox())!
  await page.mouse.move(box.x + box.width * from[0], box.y + box.height * from[1])
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * to[0], box.y + box.height * to[1], { steps: 5 })
  await page.mouse.up()
}
async function clickOn(page: Page, at: [number, number]) {
  const box = (await page.getByTestId('annotation-surface').boundingBox())!
  await page.mouse.click(box.x + box.width * at[0], box.y + box.height * at[1])
}
/** 在頁面中把圖片 bytes 解碼，取出某個比例位置的像素 */
async function pixelAt(page: Page, bytes: number[], type: string, at: [number, number]) {
  return page.evaluate(
    async ({ bytes, type, at }) => {
      const bmp = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type }))
      const c = new OffscreenCanvas(bmp.width, bmp.height)
      const ctx = c.getContext('2d')!
      ctx.drawImage(bmp, 0, 0)
      const x = Math.floor(bmp.width * at[0])
      const y = Math.floor(bmp.height * at[1])
      return Array.from(ctx.getImageData(x, y, 1, 1).data)
    },
    { bytes, type, at },
  )
}

test('貼上 → 箭頭、矩形、文字 → ⌘C，剪貼簿的圖片包含註解（SC-001）', async ({
  page,
  browserName,
}) => {
  await page.goto('./')
  await paste(page, 'photo.jpg') // 1
  await waitForResult(page)
  await page.keyboard.press('a') // 2：箭頭工具
  await dragOn(page, [0.2, 0.3], [0.6, 0.3]) // 3
  await page.keyboard.press('b') // 4：矩形工具
  await dragOn(page, [0.3, 0.5], [0.7, 0.8]) // 5
  await page.keyboard.press('t')
  await clickOn(page, [0.1, 0.85])
  await page.getByRole('textbox', { name: '輸入註解文字' }).fill('重點')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: '箭頭 1，紅色' })).toBeAttached()
  await expect(page.getByRole('button', { name: '矩形 1，紅色' })).toBeAttached()
  await expect(page.getByRole('button', { name: /文字 1「重點」/ })).toBeAttached()
  await page.locator('body').click({ position: { x: 1, y: 1 } })
  await page.keyboard.press(`${MOD}+c`)
  await expect(page.getByRole('status')).toContainText('已複製', { timeout: 30_000 })
  if (browserName !== 'chromium') return
  // 在頁面內一次完成讀回、解碼、取樣：不要把數 MB 的 PNG 以數字陣列在測試與頁面之間來回序列化
  const [r, g, b] = await page.evaluate(async () => {
    const item = (await navigator.clipboard.read())[0]!
    const bmp = await createImageBitmap(await item.getType('image/png'))
    const c = new OffscreenCanvas(bmp.width, bmp.height)
    const ctx = c.getContext('2d')!
    ctx.drawImage(bmp, 0, 0)
    return Array.from(
      ctx.getImageData(Math.floor(bmp.width * 0.4), Math.floor(bmp.height * 0.3), 1, 1).data,
    )
  })
  expect(r).toBeGreaterThan(170)
  expect(g!).toBeLessThan(100)
  expect(b!).toBeLessThan(100)
})

test('馬賽克真的破壞像素：區域內方塊單色、區域外不變；旋轉後仍覆蓋相同內容（SC-002、SC-004） @serial', async ({
  page,
}) => {
  // 這條測試要解碼、壓縮、下載、旋轉、再壓縮、再下載，在負載下容易超過 60 秒的預設時限；
  // 放寬的是測試的時間預算，不是產品的驗收標準（斷言不變）
  test.slow()
  await page.goto('./')
  await page.getByLabel('輸出格式').selectOption('png')
  await page.getByLabel('目標大小（KB）').fill('10240')
  await choose(page, 'checker.png')
  await waitForResult(page)
  const before = await page.getByTestId('result-size').textContent()
  await page.keyboard.press('m')
  await dragOn(page, [0.25, 0.25], [0.75, 0.75]) // 原圖 100..300 × 75..225
  await expect(page.getByRole('button', { name: '馬賽克 1，紅色' })).toBeAttached()
  // 等到結果真的反映馬賽克：棋盤格變成灰色方塊，PNG 大小一定會改變（不用固定的等待時間）
  await expect(page.getByTestId('result-size')).not.toHaveText(before ?? '', { timeout: 30_000 })
  const download = async () => {
    const [d] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: '下載' }).click(),
    ])
    const buf = await (await d.createReadStream())!.toArray()
    return Array.from(Buffer.concat(buf))
  }
  const bytes = await download()
  // 區域內：同一個方塊（≥ 12 px）的兩個相鄰像素顏色相同，且是灰色（黑白的平均）
  const p1 = await pixelAt(page, bytes, 'image/png', [0.5, 0.5])
  const p2 = await pixelAt(page, bytes, 'image/png', [0.5 + 1 / 400, 0.5])
  expect(p1).toEqual(p2)
  expect(p1[0]!).toBeGreaterThan(60)
  expect(p1[0]!).toBeLessThan(200)
  // 區域外：仍是純黑或純白的棋盤格
  const outside = await pixelAt(page, bytes, 'image/png', [0.05, 0.05])
  expect([0, 255]).toContain(outside[0])

  // 旋轉後再匯出：畫面中央仍是馬賽克的灰色
  await page.getByRole('button', { name: '順時針旋轉' }).click()
  await expect(page.getByTestId('result-meta')).toContainText('300×400', { timeout: 30_000 })
  const rotated = await download()
  const c = await pixelAt(page, rotated, 'image/png', [0.5, 0.5])
  expect(c[0]!).toBeGreaterThan(60)
  expect(c[0]!).toBeLessThan(200)
})

test('只用鍵盤：選工具 → Enter 建立 → 方向鍵移動 → Delete → ⌘Z 復原（SC-005）', async ({
  page,
}) => {
  await page.goto('./')
  await choose(page, 'photo.jpg')
  await waitForResult(page)
  await page.locator('body').click({ position: { x: 1, y: 1 } })
  await page.keyboard.press('b')
  await page.getByTestId('annotation-surface').focus()
  await page.keyboard.press('Enter')
  const rect = page.getByRole('button', { name: '矩形 1，紅色' })
  await expect(rect).toBeAttached()
  await rect.focus()
  const before = await rect.boundingBox()
  await page.keyboard.press('Shift+ArrowRight')
  await expect.poll(async () => (await rect.boundingBox())!.x).toBeGreaterThan(before!.x)
  await page.keyboard.press('Delete')
  await expect(rect).toHaveCount(0)
  await page.keyboard.press(`${MOD}+z`)
  await expect(page.getByRole('button', { name: '矩形 1，紅色' })).toBeAttached()
})

for (const scheme of ['light', 'dark'] as const) {
  test(`有註解與選取時，無障礙零違規（${scheme}）`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme })
    await page.goto('./')
    await choose(page, 'photo.jpg')
    await waitForResult(page)
    await page.keyboard.press('a')
    await dragOn(page, [0.2, 0.2], [0.5, 0.5])
    await page.keyboard.press('n')
    await clickOn(page, [0.7, 0.7])
    await page.getByRole('button', { name: '箭頭 1，紅色' }).focus()
    const r = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(r.violations).toEqual([])
  })
}
