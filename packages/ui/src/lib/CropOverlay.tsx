import type { Size } from '@tinyimg/core'
import { dragHandle, moveBy, resizeBy, type Box, type Handle } from '@tinyimg/editor'
import { useRef } from 'react'

const HANDLES: { h: Handle; name: string; x: number; y: number }[] = [
  { h: 'nw', name: '左上', x: 0, y: 0 },
  { h: 'n', name: '上', x: 0.5, y: 0 },
  { h: 'ne', name: '右上', x: 1, y: 0 },
  { h: 'e', name: '右', x: 1, y: 0.5 },
  { h: 'se', name: '右下', x: 1, y: 1 },
  { h: 's', name: '下', x: 0.5, y: 1 },
  { h: 'sw', name: '左下', x: 0, y: 1 },
  { h: 'w', name: '左', x: 0, y: 0.5 },
]

export function CropOverlay({
  output,
  box,
  ratio,
  onChange,
  onApply,
  onCancel,
}: {
  output: Size
  box: Box
  ratio: number | null
  onChange: (b: Box) => void
  onApply: () => void
  onCancel: () => void
}) {
  const svg = useRef<SVGSVGElement>(null)
  const group = useRef<SVGGElement>(null)
  // 控制點大小：輸出長邊的 3%，至少 1 px
  const hs = Math.max(1, Math.max(output.width, output.height) * 0.03)

  const start = (e: React.PointerEvent, h: Handle) => {
    e.preventDefault()
    e.stopPropagation()
    // preventDefault 會阻止焦點移動；主動聚焦，拖曳後仍可用鍵盤微調
    group.current?.focus({ preventScroll: true })
    const scale = output.width / (svg.current?.getBoundingClientRect().width || output.width)
    const origin = { x: e.clientX, y: e.clientY }
    const from = box
    const move = (ev: PointerEvent) =>
      onChange(
        dragHandle(
          from,
          h,
          { dx: (ev.clientX - origin.x) * scale, dy: (ev.clientY - origin.y) * scale },
          output,
          ratio,
        ),
      )
    const up = (ev: PointerEvent) => {
      move(ev)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 1
    const dir: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    const d = dir[e.key]
    if (d)
      onChange(
        e.altKey ? resizeBy(box, d[0], d[1], output, ratio) : moveBy(box, d[0], d[1], output),
      )
    else if (e.key === 'Enter') onApply()
    else if (e.key === 'Escape') onCancel()
    else return
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <svg
      ref={svg}
      className="crop-overlay"
      viewBox={`0 0 ${output.width} ${output.height}`}
      preserveAspectRatio="none"
    >
      <path
        className="crop-shade"
        fillRule="evenodd"
        d={`M0 0H${output.width}V${output.height}H0Z M${box.x} ${box.y}h${box.width}v${box.height}h${-box.width}Z`}
      />
      {/* 唯一的互動元素：可聚焦、鍵盤操作；框線本身可拖曳移動 */}
      <g
        ref={group}
        className="crop-box"
        role="button"
        aria-roledescription="裁切框"
        aria-label="裁切框：方向鍵移動，Shift 加速，Alt 調整大小，Enter 套用，Esc 取消"
        tabIndex={0}
        data-testid="crop-box"
        onKeyDown={onKeyDown}
      >
        <rect
          data-handle="move"
          className="crop-frame"
          x={box.x}
          y={box.y}
          width={box.width}
          height={box.height}
          onPointerDown={(e) => start(e, 'move')}
        />
      </g>
      {/* 控制點只供指標使用；鍵盤以 Alt + 方向鍵調整大小作為替代（不可巢狀在按鈕內） */}
      <g aria-hidden="true">
        {HANDLES.map((p) => (
          <rect
            key={p.h}
            data-handle={p.h}
            data-name={`${p.name}控制點`}
            className={`crop-handle ${p.h}`}
            x={box.x + box.width * p.x - hs / 2}
            y={box.y + box.height * p.y - hs / 2}
            width={hs}
            height={hs}
            onPointerDown={(e) => start(e, p.h)}
          />
        ))}
      </g>
    </svg>
  )
}
