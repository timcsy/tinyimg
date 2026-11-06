import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { BatchView, type Done } from '../../src/lib/BatchView'

async function png(w: number, h: number, name: string) {
  const c = new OffscreenCanvas(w, h)
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#2f9e44'
  ctx.fillRect(0, 0, w, h)
  return new File([await c.convertToBlob({ type: 'image/png' })], name, { type: 'image/png' })
}
const settings = { maxQuality: 80, targetKB: 1024, format: 'auto' as const }
// 注意：vitest/browser 的 toHaveTextContent(字串) 是完整比對（不是 jest-dom 的部分比對）
const slow = { timeout: 30_000 }

describe('BatchView', () => {
  it('依序處理、顯示每張狀態與進度；損毀的那張標示錯誤', async () => {
    const files = [
      await png(60, 40, 'a.png'),
      new File([new Uint8Array([1, 2, 3])], 'broken.png', { type: 'image/png' }),
      await png(30, 30, 'c.png'),
    ]
    const screen = await render(
      <BatchView files={files} settings={settings} onOpen={vi.fn()} onClose={vi.fn()} />,
    )
    await expect
      .element(screen.getByTestId('batch-progress'), slow)
      .toHaveTextContent('全部完成：3 / 3')
    const rows = screen.getByRole('listitem')
    expect(rows.nth(0).element().textContent).toMatch(/a\.png.*(已達成目標|原圖已符合目標)/)
    expect(rows.nth(1).element().textContent).toMatch(/broken\.png.*無法讀取/)
    await expect
      .element(screen.getByRole('button', { name: '全部下載（2 張，zip）' }))
      .toBeEnabled()
  })

  it('點選某張的「在編輯器開啟」會把該檔案交給 onOpen', async () => {
    const onOpen = vi.fn()
    const files = [await png(20, 20, 'x.png')]
    const screen = await render(
      <BatchView files={files} settings={settings} onOpen={onOpen} onClose={vi.fn()} />,
    )
    await expect
      .element(screen.getByTestId('batch-progress'), slow)
      .toHaveTextContent('全部完成：1 / 1')
    await userEvent.click(screen.getByRole('button', { name: '在編輯器開啟 x.png' }))
    expect(onOpen).toHaveBeenCalledWith(files[0])
  })

  it('取消後不再處理剩下的圖片，已完成的保留', async () => {
    // 注入由測試控制何時完成的壓縮函式，讓「取消」的時機是確定的
    const releases: (() => void)[] = []
    const compressFile = (file: File) =>
      new Promise<Done>((resolve) =>
        releases.push(() =>
          resolve({
            source: {
              name: file.name,
              mimeType: 'image/png',
              byteSize: 10,
              width: 1,
              height: 1,
              hasAlpha: false,
              isAnimated: false,
            },
            result: {
              status: 'achieved',
              bytes: new Uint8Array(5),
              mimeType: 'image/jpeg',
              width: 1,
              height: 1,
              quality: 0.8,
              colors: null,
              attempts: 1,
              warnings: [],
            },
          }),
        ),
      )
    const files = Array.from(
      { length: 4 },
      (_, i) => new File([new Uint8Array(1)], `p${i}.png`, { type: 'image/png' }),
    )
    const screen = await render(
      <BatchView
        files={files}
        settings={settings}
        onOpen={vi.fn()}
        onClose={vi.fn()}
        compressFile={compressFile}
      />,
    )
    await expect.poll(() => releases.length).toBe(1) // 第一張處理中
    await userEvent.click(screen.getByRole('button', { name: '取消' }))
    releases[0]!() // 第一張完成
    const progress = screen.getByTestId('batch-progress').element()
    await expect.poll(() => progress.textContent, slow).toBe('已取消：4 / 4')
    expect(releases.length).toBe(1) // 沒有開始第二張
    expect(screen.container.querySelectorAll('.batch-item.done').length).toBe(1)
    expect(screen.container.querySelectorAll('.batch-item.cancelled').length).toBe(3)
  })
})
