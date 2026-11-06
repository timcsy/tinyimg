import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { Toolbar } from '../../src/lib/Toolbar'

const NAMES = [
  '裁切',
  '逆時針旋轉',
  '順時針旋轉',
  '水平翻轉',
  '垂直翻轉',
  '調整尺寸',
  '復原',
  '重做',
  '全部還原',
]

describe('Toolbar', () => {
  it('role=toolbar，按鈕名稱齊全，提示包含快捷鍵', async () => {
    const screen = await render(
      <Toolbar canUndo={true} canRedo={true} cropping={false} onCommand={vi.fn()} />,
    )
    expect(screen.getByRole('toolbar', { name: '編輯工具' }).element()).toBeTruthy()
    for (const n of NAMES)
      expect(screen.getByRole('button', { name: n, exact: true }).element()).toBeTruthy()
    expect(
      screen.getByRole('button', { name: '順時針旋轉' }).element().getAttribute('title'),
    ).toContain('R')
  })
  it('不能復原或重做時對應按鈕為 disabled', async () => {
    const screen = await render(
      <Toolbar canUndo={false} canRedo={false} cropping={false} onCommand={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: '復原' }).element()).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: '重做' }).element()).toHaveProperty('disabled', true)
  })
  it('點擊送出對應命令', async () => {
    const oncommand = vi.fn()
    const screen = await render(
      <Toolbar canUndo={true} canRedo={true} cropping={false} onCommand={oncommand} />,
    )
    await userEvent.click(screen.getByRole('button', { name: '水平翻轉' }))
    expect(oncommand).toHaveBeenCalledWith('flip-x')
  })
  it('左右方向鍵在按鈕之間移動焦點（roving tabindex）', async () => {
    const screen = await render(
      <Toolbar canUndo={true} canRedo={true} cropping={false} onCommand={vi.fn()} />,
    )
    const first = screen.getByRole('button', { name: '裁切' }).element() as HTMLElement
    first.focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(document.activeElement?.getAttribute('aria-label')).toBe('逆時針旋轉')
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(document.activeElement?.getAttribute('aria-label')).toBe('全部還原')
  })
  it('裁切中，裁切按鈕為 pressed', async () => {
    const screen = await render(
      <Toolbar canUndo={true} canRedo={true} cropping={true} onCommand={vi.fn()} />,
    )
    expect(
      screen.getByRole('button', { name: '裁切' }).element().getAttribute('aria-pressed'),
    ).toBe('true')
  })
})
