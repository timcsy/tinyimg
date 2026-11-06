import { identityEdit, type Annotation } from '@tinyimg/core'
import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { AnnotationLayer, type Tool } from '../../src/lib/AnnotationLayer'

const source = { width: 400, height: 300 }
const edit = identityEdit(source)
const style = { color: '#e03131', width: 4 }

async function setup(tool: Tool, annotations: Annotation[] = [], selectedId: string | null = null) {
  const onAdd = vi.fn()
  const onUpdate = vi.fn()
  const onRemove = vi.fn()
  const onSelect = vi.fn()
  const onDraft = vi.fn()
  const screen = await render(
    <div style={{ position: 'relative', width: 400, height: 300 }}>
      <AnnotationLayer
        edit={edit}
        annotations={annotations}
        tool={tool}
        style={style}
        selectedId={selectedId}
        onAdd={onAdd}
        onUpdate={onUpdate}
        onRemove={onRemove}
        onSelect={onSelect}
        onDraft={onDraft}
      />
    </div>,
  )
  const surface = screen.container.querySelector<SVGElement>('[data-testid="annotation-surface"]')!
  return { screen, surface, onAdd, onUpdate, onRemove, onSelect, onDraft }
}

function pointer(el: Element, type: string, x: number, y: number) {
  const r = el.closest('svg')!.getBoundingClientRect()
  el.dispatchEvent(
    new PointerEvent(type, {
      clientX: r.left + x,
      clientY: r.top + y,
      pointerId: 1,
      bubbles: true,
    }),
  )
}
function drag(el: Element, from: [number, number], to: [number, number], steps = 3) {
  pointer(el, 'pointerdown', ...from)
  for (let i = 1; i <= steps; i++)
    window.dispatchEvent(
      new PointerEvent('pointermove', {
        clientX:
          el.closest('svg')!.getBoundingClientRect().left +
          from[0] +
          ((to[0] - from[0]) * i) / steps,
        clientY:
          el.closest('svg')!.getBoundingClientRect().top +
          from[1] +
          ((to[1] - from[1]) * i) / steps,
        pointerId: 1,
      }),
    )
  const r = el.closest('svg')!.getBoundingClientRect()
  window.dispatchEvent(
    new PointerEvent('pointerup', {
      clientX: r.left + to[0],
      clientY: r.top + to[1],
      pointerId: 1,
    }),
  )
}

describe('AnnotationLayer：建立', () => {
  it.each(['arrow', 'rect', 'ellipse', 'mosaic'] as const)(
    '拖曳建立 %s（原圖座標）',
    async (tool) => {
      const { surface, onAdd } = await setup(tool)
      drag(surface, [20, 30], [120, 80])
      expect(onAdd).toHaveBeenCalledOnce()
      const a = onAdd.mock.calls[0]![0] as Annotation
      expect(a.kind).toBe(tool)
      expect(a.points[0]!.x).toBeCloseTo(20, 0)
      expect(a.points[1]!.y).toBeCloseTo(80, 0)
      expect(a.color).toBe('#e03131')
    },
  )
  it('拖曳小於 3 px 視為誤觸，不建立', async () => {
    const { surface, onAdd } = await setup('rect')
    drag(surface, [20, 30], [21, 31])
    expect(onAdd).not.toHaveBeenCalled()
  })
  it('畫筆收集多個點；拖曳中會回報草稿', async () => {
    const { surface, onAdd, onDraft } = await setup('pen')
    drag(surface, [10, 10], [100, 50], 5)
    const a = onAdd.mock.calls[0]![0] as Annotation
    expect(a.kind).toBe('pen')
    expect(a.points.length).toBeGreaterThanOrEqual(4)
    expect(onDraft).toHaveBeenCalled()
    expect(onDraft).toHaveBeenLastCalledWith(null)
  })
  it('編號：點擊一次建立一個', async () => {
    const { surface, onAdd } = await setup('step')
    pointer(surface, 'pointerdown', 50, 50)
    window.dispatchEvent(new PointerEvent('pointerup', { clientX: 0, clientY: 0, pointerId: 1 }))
    expect(onAdd.mock.calls[0]![0].kind).toBe('step')
  })
  it('文字：點擊後出現輸入框，Enter 確認；空字串或 Esc 不建立', async () => {
    const { screen, surface, onAdd } = await setup('text')
    pointer(surface, 'pointerdown', 40, 40)
    window.dispatchEvent(new PointerEvent('pointerup', { clientX: 0, clientY: 0, pointerId: 1 }))
    const input = screen.getByRole('textbox', { name: '輸入註解文字' })
    await userEvent.fill(input, '重點')
    await userEvent.keyboard('{Enter}')
    expect(onAdd.mock.calls[0]![0]).toMatchObject({ kind: 'text', text: '重點' })
    pointer(surface, 'pointerdown', 80, 80)
    window.dispatchEvent(new PointerEvent('pointerup', { clientX: 0, clientY: 0, pointerId: 1 }))
    await userEvent.keyboard('{Escape}')
    expect(onAdd).toHaveBeenCalledOnce()
  })
  it('鍵盤：聚焦繪製表面後按 Enter，在中央建立預設大小的註解', async () => {
    const { surface, onAdd } = await setup('rect')
    ;(surface as unknown as HTMLElement).focus()
    await userEvent.keyboard('{Enter}')
    const a = onAdd.mock.calls[0]![0] as Annotation
    expect(a.kind).toBe('rect')
    const cx = (a.points[0]!.x + a.points[1]!.x) / 2
    expect(cx).toBeCloseTo(200, 0)
  })
})

describe('AnnotationLayer：選取與無障礙', () => {
  const list: Annotation[] = [
    {
      id: 'a1',
      kind: 'arrow',
      points: [
        { x: 10, y: 10 },
        { x: 100, y: 10 },
      ],
      color: '#e03131',
      width: 4,
    },
    {
      id: 'r1',
      kind: 'rect',
      points: [
        { x: 200, y: 100 },
        { x: 300, y: 200 },
      ],
      color: '#1c7ed6',
      width: 4,
    },
  ]
  it('每個註解有並列的命中區（role=button），名稱可讀，不巢狀', async () => {
    const { screen } = await setup('select', list)
    expect(screen.getByRole('button', { name: '箭頭 1，紅色' }).element()).toBeTruthy()
    expect(screen.getByRole('button', { name: '矩形 1，藍色' }).element()).toBeTruthy()
    const svg = screen.container.querySelector('svg')!
    for (const b of svg.querySelectorAll('[role="button"]'))
      expect(b.querySelector('[role="button"]')).toBeNull()
  })
  it('聚焦命中區即選取；方向鍵移動（Shift 加速）；Delete 刪除', async () => {
    const { screen, onSelect, onUpdate, onRemove } = await setup('select', list, 'r1')
    ;(screen.getByRole('button', { name: '矩形 1，藍色' }).element() as HTMLElement).focus()
    expect(onSelect).toHaveBeenCalledWith('r1')
    await userEvent.keyboard('{ArrowRight}')
    expect(onUpdate).toHaveBeenLastCalledWith('r1', {
      points: [
        { x: 201, y: 100 },
        { x: 301, y: 200 },
      ],
    })
    await userEvent.keyboard('{Shift>}{ArrowDown}{/Shift}')
    expect(onUpdate).toHaveBeenLastCalledWith('r1', {
      points: [
        { x: 200, y: 110 },
        { x: 300, y: 210 },
      ],
    })
    await userEvent.keyboard('{Delete}')
    expect(onRemove).toHaveBeenCalledWith('r1')
  })
  it('選取工具點擊空白處取消選取；點到註解則選取', async () => {
    const { surface, onSelect } = await setup('select', list)
    pointer(surface, 'pointerdown', 250, 150)
    window.dispatchEvent(new PointerEvent('pointerup', { clientX: 0, clientY: 0, pointerId: 1 }))
    expect(onSelect).toHaveBeenLastCalledWith('r1')
    pointer(surface, 'pointerdown', 390, 290)
    window.dispatchEvent(new PointerEvent('pointerup', { clientX: 0, clientY: 0, pointerId: 1 }))
    expect(onSelect).toHaveBeenLastCalledWith(null)
  })
  it('選取工具拖曳註解會移動它（放開時一次更新）', async () => {
    const { surface, onUpdate } = await setup('select', list)
    drag(surface, [250, 150], [270, 160])
    expect(onUpdate).toHaveBeenLastCalledWith('r1', {
      points: [
        { x: 220, y: 110 },
        { x: 320, y: 210 },
      ],
    })
  })
})
