import type { Point, Rect } from './edit'
import type { RawImage } from './types'

export type AnnotationKind =
  'pen' | 'highlighter' | 'arrow' | 'rect' | 'ellipse' | 'text' | 'step' | 'mosaic'

/** 註解：所有座標與長度都以「原圖像素」為單位（research 003 R1） */
export interface Annotation {
  id: string
  kind: AnnotationKind
  /** pen、highlighter：點列；arrow：起點、終點；rect、ellipse、mosaic：一角、對角；text、step：位置 */
  points: Point[]
  color: string
  width: number
  text?: string
}

/** renderAnnotations 需要的最小 2D context 介面（CanvasRenderingContext2D 與 OffscreenCanvas 皆符合） */
export interface Ctx2D {
  strokeStyle: string | CanvasGradient | CanvasPattern
  fillStyle: string | CanvasGradient | CanvasPattern
  lineWidth: number
  lineCap: CanvasLineCap
  lineJoin: CanvasLineJoin
  globalAlpha: number
  font: string
  textAlign: CanvasTextAlign
  textBaseline: CanvasTextBaseline
  save(): void
  restore(): void
  beginPath(): void
  moveTo(x: number, y: number): void
  lineTo(x: number, y: number): void
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void
  ellipse(
    x: number,
    y: number,
    rx: number,
    ry: number,
    rotation: number,
    start: number,
    end: number,
  ): void
  arc(x: number, y: number, r: number, start: number, end: number): void
  closePath(): void
  stroke(): void
  fill(): void
  strokeRect(x: number, y: number, w: number, h: number): void
  fillText(text: string, x: number, y: number): void
}

export const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans TC', 'PingFang TC', sans-serif"

/** 兩點構成的矩形（正規化成正的寬高） */
export function boxOf(a: Point, b: Point): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  }
}

/** 文字與編號的字級（由 width 決定） */
export const textSize = (width: number) => Math.max(12, width * 5)
export const stepRadius = (width: number) => width * 3 + 8

/** 馬賽克方塊邊長：至少 12 px，且至少為區域短邊的 1/20（spec FR-004） */
export function mosaicBlock(r: Rect): number {
  return Math.max(12, Math.ceil(Math.min(r.width, r.height) / 20))
}

/**
 * 馬賽克：把區域內的每個方塊替換成該方塊的平均色（真的破壞像素，無法還原）。
 * 不修改輸入；區域會被夾在影像範圍內；區域外的像素完全不變。
 */
export function pixelate(img: RawImage, rect: Rect, block: number): RawImage {
  const out = new Uint8ClampedArray(img.data)
  const x0 = Math.max(0, Math.floor(rect.x))
  const y0 = Math.max(0, Math.floor(rect.y))
  const x1 = Math.min(img.width, Math.ceil(rect.x + rect.width))
  const y1 = Math.min(img.height, Math.ceil(rect.y + rect.height))
  for (let by = y0; by < y1; by += block) {
    for (let bx = x0; bx < x1; bx += block) {
      const ex = Math.min(bx + block, x1)
      const ey = Math.min(by + block, y1)
      const sum = [0, 0, 0, 0]
      for (let y = by; y < ey; y++)
        for (let x = bx; x < ex; x++) {
          const i = (y * img.width + x) * 4
          for (let c = 0; c < 4; c++) sum[c]! += img.data[i + c]!
        }
      const n = (ex - bx) * (ey - by)
      const avg = sum.map((v) => Math.round(v / n))
      for (let y = by; y < ey; y++)
        for (let x = bx; x < ex; x++) out.set(avg, (y * img.width + x) * 4)
    }
  }
  return { width: img.width, height: img.height, data: out }
}

/** 依清單順序取得編號標記的號碼（從 1 開始；刪除後自然遞補） */
export function stepNumbers(list: Annotation[]): Map<string, number> {
  const m = new Map<string, number>()
  let n = 0
  for (const a of list) if (a.kind === 'step') m.set(a.id, ++n)
  return m
}

function strokePath(ctx: Ctx2D, pts: Point[]) {
  const [first, ...rest] = pts
  if (!first) return
  ctx.beginPath()
  ctx.moveTo(first.x, first.y)
  if (rest.length === 0) ctx.lineTo(first.x + 0.01, first.y)
  // 以中點做二次曲線平滑（減少手抖造成的鋸齒）
  for (let i = 0; i < rest.length - 1; i++) {
    const p = rest[i]!
    const q = rest[i + 1]!
    ctx.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2)
  }
  const last = rest[rest.length - 1]
  if (last) ctx.lineTo(last.x, last.y)
  ctx.stroke()
}

/** 畫出所有非馬賽克的註解（預覽與匯出共用，research 003 R3） */
export function renderAnnotations(ctx: Ctx2D, list: Annotation[]): void {
  const steps = stepNumbers(list)
  for (const a of list) {
    ctx.save()
    if (a.kind !== 'mosaic') {
      ctx.strokeStyle = a.color
      ctx.fillStyle = a.color
      ctx.lineWidth = a.width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    }
    const [p, q] = a.points
    switch (a.kind) {
      case 'pen':
        strokePath(ctx, a.points)
        break
      case 'highlighter':
        ctx.globalAlpha = 0.4
        ctx.lineWidth = a.width * 3
        ctx.lineCap = 'square'
        strokePath(ctx, a.points)
        break
      case 'rect':
        if (p && q) {
          const r = boxOf(p, q)
          ctx.strokeRect(r.x, r.y, r.width, r.height)
        }
        break
      case 'ellipse':
        if (p && q) {
          const r = boxOf(p, q)
          ctx.beginPath()
          ctx.ellipse(
            r.x + r.width / 2,
            r.y + r.height / 2,
            r.width / 2,
            r.height / 2,
            0,
            0,
            Math.PI * 2,
          )
          ctx.stroke()
        }
        break
      case 'arrow':
        if (p && q) {
          const angle = Math.atan2(q.y - p.y, q.x - p.x)
          const head = a.width * 4 + 6
          ctx.beginPath()
          ctx.moveTo(p.x, p.y)
          ctx.lineTo(q.x, q.y)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(q.x, q.y)
          ctx.lineTo(
            q.x - head * Math.cos(angle - Math.PI / 6),
            q.y - head * Math.sin(angle - Math.PI / 6),
          )
          ctx.lineTo(
            q.x - head * Math.cos(angle + Math.PI / 6),
            q.y - head * Math.sin(angle + Math.PI / 6),
          )
          ctx.closePath()
          ctx.fill()
        }
        break
      case 'text':
        if (p && a.text) {
          ctx.font = `600 ${textSize(a.width)}px ${FONT_STACK}`
          ctx.textAlign = 'left'
          ctx.textBaseline = 'top'
          ctx.fillText(a.text, p.x, p.y)
        }
        break
      case 'step':
        if (p) {
          const r = stepRadius(a.width)
          ctx.beginPath()
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#ffffff'
          ctx.font = `700 ${Math.round(r * 1.1)}px ${FONT_STACK}`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(String(steps.get(a.id) ?? ''), p.x, p.y)
        }
        break
      case 'mosaic':
        // 馬賽克由 pixelate 直接破壞像素處理
        break
    }
    ctx.restore()
  }
}

/**
 * 匯出用：先對所有馬賽克執行 pixelate（破壞原圖像素），再把其他註解交給 draw 畫上去
 * （瀏覽器以 OffscreenCanvas 實作；research 003 R2）。
 */
export async function applyAnnotations(
  img: RawImage,
  list: Annotation[],
  draw?: (img: RawImage, vectors: Annotation[]) => Promise<RawImage>,
): Promise<RawImage> {
  if (list.length === 0) return img
  let out = img
  for (const a of list) {
    const [p, q] = a.points
    if (a.kind === 'mosaic' && p && q) {
      const r = boxOf(p, q)
      out = pixelate(out, r, mosaicBlock(r))
    }
  }
  const vectors = list.filter((a) => a.kind !== 'mosaic')
  if (vectors.length > 0 && draw) out = await draw(out, vectors)
  return out
}
