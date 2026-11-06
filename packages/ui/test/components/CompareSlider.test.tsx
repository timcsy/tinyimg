import { describe, expect, it } from 'vitest'
import { useState } from 'react'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { CompareSlider } from '../../src/lib/CompareSlider'

function Harness({ after }: { after: string }) {
  const [v, setV] = useState(50)
  return <CompareSlider after={after} value={v} onChange={setV} />
}

const png =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

describe('CompareSlider', () => {
  it('預設 50%，有無障礙名稱與數值描述', async () => {
    const screen = await render(<Harness after={png} />)
    const s = screen.getByRole('slider', { name: '前後對比' }).element()
    expect(s.getAttribute('aria-valuetext')).toBe('50%（左側未壓縮、右側壓縮後）')
  })
  it('方向鍵每次 5%，Home 為 0%、End 為 100%', async () => {
    const screen = await render(<Harness after={png} />)
    const s = screen.getByRole('slider', { name: '前後對比' })
    await userEvent.click(s)
    ;(s.element() as HTMLInputElement).focus()
    await userEvent.keyboard('{Home}')
    expect(s.element().getAttribute('aria-valuetext')).toBe('0%（左側未壓縮、右側壓縮後）')
    await userEvent.keyboard('{ArrowRight}')
    expect(s.element().getAttribute('aria-valuetext')).toBe('5%（左側未壓縮、右側壓縮後）')
    await userEvent.keyboard('{End}')
    expect(s.element().getAttribute('aria-valuetext')).toBe('100%（左側未壓縮、右側壓縮後）')
  })
  it('壓縮後圖片依比例裁切顯示', async () => {
    const screen = await render(<Harness after={png} />)
    const img = screen.getByAltText('壓縮後').element() as HTMLElement
    expect(img.style.clipPath).toContain('50%')
  })
})
