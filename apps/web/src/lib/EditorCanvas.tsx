import {
  boxOf,
  mosaicBlock,
  renderAnnotations,
  sourceToOutputMatrix,
  type Annotation,
  type EditState,
  type Size,
} from '@tinyimg/core'
import { useLayoutEffect, useMemo, useRef } from 'react'

/** 把原圖座標映到畫布像素的變換 */
function applyTransform(
  ctx: CanvasRenderingContext2D,
  edit: EditState,
  width: number,
  height: number,
) {
  const [a, b, c, d, e, f] = sourceToOutputMatrix(edit)
  const sx = width / edit.output.width
  const sy = height / edit.output.height
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, width, height)
  ctx.setTransform(a * sx, b * sy, c * sx, d * sy, e * sx, f * sy)
}

/**
 * 畫布分兩層：
 * - 底層：預覽點陣圖加馬賽克預覽，只在編輯或馬賽克改變時重畫（大圖的 drawImage 在 Firefox 很貴）
 * - 上層：向量註解，拖曳時只重畫這一層（SC-006）
 * 兩層都依 EditState 的同一個變換算繪（預覽與匯出共用同一份狀態，research 002 R2、003 R3）
 */
export function EditorCanvas({
  preview,
  source,
  edit,
  annotations = [],
}: {
  preview: ImageBitmap
  source: Size
  edit: EditState
  /** 原圖座標的註解（含正在畫的草稿） */
  annotations?: Annotation[]
}) {
  const base = useRef<HTMLCanvasElement>(null)
  const overlay = useRef<HTMLCanvasElement>(null)
  // 畫布像素尺寸：輸出尺寸，但最長邊不超過 1600（預覽用）
  const k = Math.min(1, 1600 / Math.max(edit.output.width, edit.output.height))
  const width = Math.max(1, Math.round(edit.output.width * k))
  const height = Math.max(1, Math.round(edit.output.height * k))
  const mosaics = useMemo(() => annotations.filter((a) => a.kind === 'mosaic'), [annotations])
  const mosaicKey = JSON.stringify(mosaics.map((m) => m.points))
  const vectors = useMemo(() => annotations.filter((a) => a.kind !== 'mosaic'), [annotations])

  useLayoutEffect(() => {
    const ctx = base.current?.getContext('2d')
    if (!ctx) return
    applyTransform(ctx, edit, width, height)
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(preview, 0, 0, source.width, source.height)
    // 馬賽克預覽：把區域縮成方塊數大小，再以最近鄰放大（匯出時由 pixelate 精確計算）
    const ps = preview.width / source.width
    for (const a of mosaics) {
      const [p, q] = a.points
      if (!p || !q) continue
      const r = boxOf(p, q)
      if (r.width < 1 || r.height < 1) continue
      const block = mosaicBlock(r)
      const tiny = new OffscreenCanvas(
        Math.max(1, Math.ceil(r.width / block)),
        Math.max(1, Math.ceil(r.height / block)),
      )
      const tctx = tiny.getContext('2d')
      if (!tctx) continue
      tctx.drawImage(
        preview,
        r.x * ps,
        r.y * ps,
        r.width * ps,
        r.height * ps,
        0,
        0,
        tiny.width,
        tiny.height,
      )
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(tiny, r.x, r.y, r.width, r.height)
      ctx.imageSmoothingEnabled = true
    }
    performance.mark('tinyimg:render')
    // mosaicKey 代表馬賽克的幾何；只有它改變時才需要重畫底層
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview, source, edit, width, height, mosaicKey])

  useLayoutEffect(() => {
    const ctx = overlay.current?.getContext('2d')
    if (!ctx) return
    applyTransform(ctx, edit, width, height)
    renderAnnotations(ctx, vectors)
    performance.mark('tinyimg:render')
  }, [edit, width, height, vectors])

  return (
    <div
      className="editor-canvas-wrap"
      style={{ aspectRatio: `${edit.output.width} / ${edit.output.height}` }}
    >
      <canvas ref={base} className="editor-canvas" width={width} height={height}>
        編輯中的圖片，{edit.output.width} × {edit.output.height}
      </canvas>
      <canvas
        ref={overlay}
        className="editor-canvas-overlay"
        width={width}
        height={height}
        aria-hidden="true"
      />
    </div>
  )
}
