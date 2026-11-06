import {
  mapPoint,
  orientedSize,
  sourceToOutputMatrix,
  stepRadius,
  type Annotation,
  type AnnotationKind,
  type EditState,
  type Point,
} from '@tinyimg/core'
import { annotationLabel, hitTest, KIND_NAME, moveAnnotation, textBox } from '@tinyimg/editor'
import { memo, useMemo, useRef, useState } from 'react'

export type Tool = 'select' | AnnotationKind
export interface AnnotationStyle {
  color: string
  /** 畫面像素；建立時換算成原圖像素 */
  width: number
}

const MIN_DRAG = 3 // 小於 3 個畫面像素視為誤觸
const DRAG_KINDS = new Set<Tool>(['arrow', 'rect', 'ellipse', 'mosaic'])
const LINE_KINDS = new Set<Tool>(['pen', 'highlighter'])

let counter = 0
const newId = () => `a${Date.now().toString(36)}${(counter++).toString(36)}`

/** 註解在畫面座標中的外框（命中區與選取框用） */
function outputBox(a: Annotation, edit: EditState) {
  const [ma, mb, mc, md, me, mf] = sourceToOutputMatrix(edit)
  const map = (p: Point) => ({ x: ma * p.x + mc * p.y + me, y: mb * p.x + md * p.y + mf })
  let pts: Point[]
  if (a.kind === 'text') {
    const r = textBox(a)
    pts = [
      { x: r.x, y: r.y },
      { x: r.x + r.width, y: r.y + r.height },
    ]
  } else if (a.kind === 'step') {
    const p = a.points[0]!
    const r = stepRadius(a.width)
    pts = [
      { x: p.x - r, y: p.y - r },
      { x: p.x + r, y: p.y + r },
    ]
  } else pts = a.points
  const mapped = pts.map(map)
  const xs = mapped.map((p) => p.x)
  const ys = mapped.map((p) => p.y)
  const pad = Math.max(2, (a.width * Math.hypot(ma, mb)) / 2)
  const x = Math.min(...xs) - pad
  const y = Math.min(...ys) - pad
  return { x, y, width: Math.max(...xs) - x + pad, height: Math.max(...ys) - y + pad }
}

export const AnnotationLayer = memo(function AnnotationLayer({
  edit,
  annotations,
  tool,
  style,
  selectedId,
  onAdd,
  onUpdate,
  onRemove,
  onSelect,
  onDraft,
}: {
  edit: EditState
  annotations: Annotation[]
  tool: Tool
  style: AnnotationStyle
  selectedId: string | null
  onAdd: (a: Annotation) => void
  onUpdate: (id: string, patch: Partial<Annotation>) => void
  onRemove: (id: string) => void
  onSelect: (id: string | null) => void
  onDraft: (a: Annotation | null) => void
}) {
  const svg = useRef<SVGSVGElement>(null)
  const [textAt, setTextAt] = useState<{ source: Point; screen: Point } | null>(null)
  // 按 Enter 確認後輸入框會被移除，部分瀏覽器會再觸發 blur；用旗標避免同一段文字新增兩次
  const committed = useRef(false)
  const commitText = (value: string) => {
    if (committed.current || !textAt) return
    committed.current = true
    const v = value.trim()
    if (v) onAdd(make('text', [textAt.source], v))
    setTextAt(null)
  }
  const openText = (at: { source: Point; screen: Point }) => {
    committed.current = false
    setTextAt(at)
  }
  const out = edit.output
  // 原圖像素 / 畫面輸出像素：把使用者選的粗細換算成原圖像素
  const k = orientedSize(edit).width / out.width

  /** 指標座標 → 輸出座標（viewBox）→ 原圖座標 */
  const toOutput = (clientX: number, clientY: number): Point => {
    const r = svg.current!.getBoundingClientRect()
    return {
      x: ((clientX - r.left) * out.width) / r.width,
      y: ((clientY - r.top) * out.height) / r.height,
    }
  }
  const toSource = (p: Point) => mapPoint(edit, p)
  const screenScale = () => out.width / svg.current!.getBoundingClientRect().width

  const make = (kind: AnnotationKind, points: Point[], text?: string): Annotation => ({
    id: newId(),
    kind,
    points,
    color: style.color,
    width: style.width * k,
    ...(text !== undefined ? { text } : {}),
  })

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    const startOut = toOutput(e.clientX, e.clientY)
    const start = toSource(startOut)
    const minDrag = MIN_DRAG * screenScale()

    if (tool === 'text') {
      const r = svg.current!.getBoundingClientRect()
      openText({ source: start, screen: { x: e.clientX - r.left, y: e.clientY - r.top } })
      return
    }
    if (tool === 'step') {
      onAdd(make('step', [start]))
      return
    }
    if (tool === 'select') {
      const id = hitTest(annotations, start, 4 * screenScale() * k)
      onSelect(id)
      if (!id) return
      const target = annotations.find((a) => a.id === id)!
      let last = start
      const move = (ev: PointerEvent) => {
        last = toSource(toOutput(ev.clientX, ev.clientY))
        onDraft(moveAnnotation(target, last.x - start.x, last.y - start.y))
      }
      const up = (ev: PointerEvent) => {
        last = toSource(toOutput(ev.clientX, ev.clientY))
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        onDraft(null)
        const dx = last.x - start.x
        const dy = last.y - start.y
        if (Math.hypot(dx, dy) > 0) onUpdate(id, { points: moveAnnotation(target, dx, dy).points })
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
      return
    }

    const points: Point[] = [start]
    let endOut = startOut
    const current = () =>
      LINE_KINDS.has(tool) ? make(tool, [...points]) : make(tool, [start, toSource(endOut)])
    const move = (ev: PointerEvent) => {
      endOut = toOutput(ev.clientX, ev.clientY)
      if (LINE_KINDS.has(tool)) points.push(toSource(endOut))
      onDraft(current())
    }
    const up = (ev: PointerEvent) => {
      endOut = toOutput(ev.clientX, ev.clientY)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      onDraft(null)
      const dist = Math.hypot(endOut.x - startOut.x, endOut.y - startOut.y)
      if (LINE_KINDS.has(tool)) {
        if (points.length === 1 || dist >= minDrag) {
          if (points.length > 1 || dist < minDrag) points.push(toSource(endOut))
          onAdd(make(tool, points))
        }
      } else if (DRAG_KINDS.has(tool) && dist >= minDrag) {
        onAdd(make(tool, [start, toSource(endOut)]))
      }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  /** 鍵盤建立：在畫面中央建立預設大小的註解（spec FR-011） */
  const createAtCenter = () => {
    const c = { x: out.width / 2, y: out.height / 2 }
    const d = Math.min(out.width, out.height) / 6
    const a = toSource({ x: c.x - d, y: c.y - d })
    const b = toSource({ x: c.x + d, y: c.y + d })
    if (tool === 'select') return
    if (tool === 'text') {
      const r = svg.current!.getBoundingClientRect()
      openText({ source: toSource(c), screen: { x: r.width / 2, y: r.height / 2 } })
    } else if (tool === 'step') onAdd(make('step', [toSource(c)]))
    else if (LINE_KINDS.has(tool)) onAdd(make(tool, [a, toSource({ x: c.x, y: c.y + d / 2 }), b]))
    else onAdd(make(tool, [a, b]))
  }

  const onHitKeyDown = (e: React.KeyboardEvent, a: Annotation) => {
    const step = (e.shiftKey ? 10 : 1) * k * screenScale()
    const dir: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }
    const d = dir[e.key]
    if (d) {
      // 以畫面方向移動：把畫面上的位移換算成原圖座標的位移
      const o = mapPoint(edit, { x: 0, y: 0 })
      const m = mapPoint(edit, { x: d[0], y: d[1] })
      const unit = Math.hypot(m.x - o.x, m.y - o.y) || 1
      const dx = Math.round(((m.x - o.x) / unit) * step)
      const dy = Math.round(((m.y - o.y) / unit) * step)
      onUpdate(a.id, { points: moveAnnotation(a, dx, dy).points })
    } else if (e.key === 'Delete' || e.key === 'Backspace') onRemove(a.id)
    else if (e.key === 'Escape') onSelect(null)
    else return
    e.preventDefault()
    e.stopPropagation()
  }

  // 描述文字與外框只在清單或編輯改變時重算（拖曳時清單不變，避免每次移動都 O(n²) 重算）
  const hitAreas = useMemo(
    () =>
      annotations.map((a) => ({
        a,
        label: annotationLabel(annotations, a.id),
        box: outputBox(a, edit),
      })),
    [annotations, edit],
  )

  const surfaceLabel =
    tool === 'select'
      ? '註解畫布：選取工具'
      : `註解畫布：${KIND_NAME[tool]}。拖曳建立，或按 Enter 在中央建立`

  return (
    <>
      <svg
        ref={svg}
        className="annotation-layer"
        viewBox={`0 0 ${out.width} ${out.height}`}
        preserveAspectRatio="none"
      >
        <rect
          data-testid="annotation-surface"
          role="button"
          tabIndex={0}
          aria-label={surfaceLabel}
          className={`annotation-surface tool-${tool}`}
          x={0}
          y={0}
          width={out.width}
          height={out.height}
          onPointerDown={onPointerDown}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              e.stopPropagation()
              createAtCenter()
            }
          }}
        />
        {hitAreas.map(({ a, label, box: r }) => {
          const selected = a.id === selectedId
          return (
            <rect
              key={a.id}
              role="button"
              tabIndex={0}
              aria-label={label}
              aria-pressed={selected}
              className={`annotation-hit${selected ? ' selected' : ''}`}
              style={{ pointerEvents: 'none' }}
              x={r.x}
              y={r.y}
              width={r.width}
              height={r.height}
              onFocus={() => onSelect(a.id)}
              onKeyDown={(e) => onHitKeyDown(e, a)}
            />
          )
        })}
      </svg>
      {textAt && (
        <input
          className="annotation-text-input"
          aria-label="輸入註解文字"
          autoFocus
          style={{ left: textAt.screen.x, top: textAt.screen.y, color: style.color }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitText(e.currentTarget.value)
            else if (e.key === 'Escape') {
              committed.current = true
              setTextAt(null)
            }
            e.stopPropagation()
          }}
          onBlur={(e) => commitText(e.currentTarget.value)}
        />
      )}
    </>
  )
})
