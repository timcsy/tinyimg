import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { CropOverlay } from '../../src/lib/CropOverlay'

const output = { width: 400, height: 300 }
const box = { x: 100, y: 100, width: 100, height: 50 }

async function setup(over: { box?: typeof box; ratio?: number | null } = {}) {
  const onchange = vi.fn()
  const onapply = vi.fn()
  const oncancel = vi.fn()
  const screen = await render(
    <CropOverlay
      output={output}
      box={over.box ?? box}
      ratio={over.ratio ?? null}
      onChange={onchange}
      onApply={onapply}
      onCancel={oncancel}
    />,
  )
  const container = screen.container
  // 讓 SVG 以 1:1 的 CSS 尺寸顯示，方便換算指標座標
  const svg = container.querySelector('svg')!
  svg.style.width = '400px'
  svg.style.height = '300px'
  return { screen, svg, onchange, onapply, oncancel }
}

function drag(el: Element, dx: number, dy: number) {
  const r = el.getBoundingClientRect()
  const x = r.left + r.width / 2
  const y = r.top + r.height / 2
  el.dispatchEvent(
    new PointerEvent('pointerdown', { clientX: x, clientY: y, pointerId: 1, bubbles: true }),
  )
  window.dispatchEvent(
    new PointerEvent('pointermove', { clientX: x + dx, clientY: y + dy, pointerId: 1 }),
  )
  window.dispatchEvent(
    new PointerEvent('pointerup', { clientX: x + dx, clientY: y + dy, pointerId: 1 }),
  )
}

describe('CropOverlay', () => {
  it('有八個具名的控制點', async () => {
    const { screen } = await setup()
    for (const name of ['左上', '上', '右上', '右', '右下', '下', '左下', '左'])
      expect(screen.getByRole('button', { name: `${name}控制點` }).element()).toBeTruthy()
  })
  it('拖曳右下控制點會放大裁切框', async () => {
    const { screen, onchange } = await setup()
    drag(screen.getByRole('button', { name: '右下控制點' }).element(), 20, 10)
    expect(onchange).toHaveBeenLastCalledWith({ x: 100, y: 100, width: 120, height: 60 })
  })
  it('拖曳框內部會移動整個框', async () => {
    const { screen, onchange } = await setup()
    drag(screen.getByTestId('crop-box').element().querySelector('[data-handle="move"]')!, 30, 0)
    expect(onchange).toHaveBeenLastCalledWith({ x: 130, y: 100, width: 100, height: 50 })
  })
  it('1:1 時拖曳維持正方形', async () => {
    const { screen, onchange } = await setup({
      box: { x: 100, y: 100, width: 100, height: 100 },
      ratio: 1,
    })
    drag(screen.getByRole('button', { name: '右下控制點' }).element(), 40, 0)
    const b = onchange.mock.lastCall![0]
    expect(b.width).toBe(b.height)
  })
  it('方向鍵移動 1 px，Shift 加速為 10 px，Alt 調整大小', async () => {
    const { screen, onchange } = await setup()
    await userEvent.click(screen.getByTestId('crop-box'))
    await userEvent.keyboard('{ArrowLeft}')
    expect(onchange).toHaveBeenLastCalledWith({ ...box, x: 99 })
    await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}')
    expect(onchange).toHaveBeenLastCalledWith({ ...box, y: 110 })
    await userEvent.keyboard('{Alt>}{ArrowRight}{/Alt}')
    expect(onchange).toHaveBeenLastCalledWith({ ...box, width: 101 })
  })
  it('Enter 套用、Escape 取消', async () => {
    const { screen, onapply, oncancel } = await setup()
    await userEvent.click(screen.getByTestId('crop-box'))
    await userEvent.keyboard('{Enter}')
    expect(onapply).toHaveBeenCalledOnce()
    await userEvent.keyboard('{Escape}')
    expect(oncancel).toHaveBeenCalledOnce()
  })
})
