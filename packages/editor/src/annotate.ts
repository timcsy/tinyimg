import {
  boxOf,
  stepNumbers,
  stepRadius,
  textSize,
  type Annotation,
  type Point,
} from '@tinyimg/core'

/** 預設 8 色（含高對比的紅、黃、藍、綠、黑、白；spec FR-002） */
export const PALETTE: { value: string; name: string }[] = [
  { value: '#e03131', name: '紅色' },
  { value: '#f08c00', name: '橘色' },
  { value: '#fcc419', name: '黃色' },
  { value: '#2f9e44', name: '綠色' },
  { value: '#1c7ed6', name: '藍色' },
  { value: '#7048e8', name: '紫色' },
  { value: '#212529', name: '黑色' },
  { value: '#ffffff', name: '白色' },
]

export const KIND_NAME: Record<Annotation['kind'], string> = {
  pen: '畫筆',
  highlighter: '螢光筆',
  arrow: '箭頭',
  rect: '矩形',
  ellipse: '橢圓',
  text: '文字',
  step: '編號',
  mosaic: '馬賽克',
}

export function stepNumber(list: Annotation[], id: string): number | null {
  return stepNumbers(list).get(id) ?? null
}

/** 給輔助科技的描述，例如「箭頭 2，藍色」（同種類中的順序） */
export function annotationLabel(list: Annotation[], id: string): string {
  const a = list.find((x) => x.id === id)
  if (!a) return ''
  const n = list.filter((x) => x.kind === a.kind).findIndex((x) => x.id === id) + 1
  const color = PALETTE.find((p) => p.value === a.color)?.name ?? a.color
  const text = a.kind === 'text' && a.text ? `「${a.text}」` : ''
  return `${KIND_NAME[a.kind]} ${n}${text}，${color}`
}

function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

/** 估計文字的方框（不依賴實際字型量測；每字約 1 個字級寬） */
export function textBox(a: Annotation) {
  const p = a.points[0] ?? { x: 0, y: 0 }
  const size = textSize(a.width)
  return {
    x: p.x,
    y: p.y,
    width: Math.max(size, (a.text?.length ?? 1) * size),
    height: size * 1.25,
  }
}

function hits(a: Annotation, p: Point, tol: number): boolean {
  const [s, e] = a.points
  switch (a.kind) {
    case 'rect':
    case 'ellipse':
    case 'mosaic': {
      if (!s || !e) return false
      const r = boxOf(s, e)
      return (
        p.x >= r.x - tol &&
        p.x <= r.x + r.width + tol &&
        p.y >= r.y - tol &&
        p.y <= r.y + r.height + tol
      )
    }
    case 'arrow':
      return !!s && !!e && distToSegment(p, s, e) <= tol + a.width / 2
    case 'pen':
    case 'highlighter': {
      const w = (a.kind === 'highlighter' ? a.width * 3 : a.width) / 2
      if (a.points.length === 1) return Math.hypot(p.x - s!.x, p.y - s!.y) <= tol + w
      for (let i = 0; i < a.points.length - 1; i++)
        if (distToSegment(p, a.points[i]!, a.points[i + 1]!) <= tol + w) return true
      return false
    }
    case 'step':
      return !!s && Math.hypot(p.x - s.x, p.y - s.y) <= stepRadius(a.width) + tol
    case 'text': {
      const r = textBox(a)
      return (
        p.x >= r.x - tol &&
        p.x <= r.x + r.width + tol &&
        p.y >= r.y - tol &&
        p.y <= r.y + r.height + tol
      )
    }
  }
}

/** 回傳命中的最上層（清單後面的）註解 id */
export function hitTest(list: Annotation[], p: Point, tolerance: number): string | null {
  for (let i = list.length - 1; i >= 0; i--) if (hits(list[i]!, p, tolerance)) return list[i]!.id
  return null
}

export function moveAnnotation(a: Annotation, dx: number, dy: number): Annotation {
  return { ...a, points: a.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) }
}
