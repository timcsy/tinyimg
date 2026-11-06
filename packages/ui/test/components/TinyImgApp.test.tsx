import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { TinyImgApp } from '../../src'

async function pngFile(w: number, h: number, name: string): Promise<File> {
  const c = new OffscreenCanvas(w, h)
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#336699'
  ctx.fillRect(0, 0, w, h)
  return new File([await c.convertToBlob({ type: 'image/png' })], name, { type: 'image/png' })
}

describe('TinyImgApp incoming（外部送入的圖片）', () => {
  it('key 改變時載入新圖片；key 相同時不重複載入', async () => {
    const a = await pngFile(100, 80, 'a.png')
    const b = await pngFile(50, 40, 'b.png')
    const screen = await render(<TinyImgApp incoming={{ file: a, key: 'k1' }} />)
    await expect.element(screen.getByTestId('output-size')).toHaveTextContent('100 × 80')
    await screen.rerender(<TinyImgApp incoming={{ file: b, key: 'k1' }} />)
    await new Promise((r) => setTimeout(r, 300))
    await expect.element(screen.getByTestId('output-size')).toHaveTextContent('100 × 80')
    await screen.rerender(<TinyImgApp incoming={{ file: b, key: 'k2' }} />)
    await expect.element(screen.getByTestId('output-size')).toHaveTextContent('50 × 40')
  })
  it('沒有 incoming 時顯示放入區', async () => {
    const screen = await render(<TinyImgApp incoming={null} />)
    await expect.element(screen.getByTestId('dropzone')).toBeVisible()
  })
})
