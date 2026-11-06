import { sourceToOutputMatrix, type EditState, type Size } from '@tinyimg/core'
import { useLayoutEffect, useRef } from 'react'

/** 以預覽點陣圖依 EditState 算繪（預覽與匯出共用同一份標準化狀態，research 002 R2） */
export function EditorCanvas({
  preview,
  source,
  edit,
}: {
  preview: ImageBitmap
  source: Size
  edit: EditState
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  // 畫布像素尺寸：輸出尺寸，但最長邊不超過 1600（預覽用）
  const k = Math.min(1, 1600 / Math.max(edit.output.width, edit.output.height))
  const width = Math.max(1, Math.round(edit.output.width * k))
  const height = Math.max(1, Math.round(edit.output.height * k))

  useLayoutEffect(() => {
    const ctx = canvas.current?.getContext('2d')
    if (!ctx) return
    const [a, b, c, d, e, f] = sourceToOutputMatrix(edit)
    const sx = width / edit.output.width
    const sy = height / edit.output.height
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, width, height)
    ctx.setTransform(a * sx, b * sy, c * sx, d * sy, e * sx, f * sy)
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(preview, 0, 0, source.width, source.height)
    performance.mark('tinyimg:render')
  }, [preview, source, edit, width, height])

  return (
    <canvas
      ref={canvas}
      className="editor-canvas"
      width={width}
      height={height}
      style={{ aspectRatio: `${edit.output.width} / ${edit.output.height}` }}
    >
      編輯中的圖片，{edit.output.width} × {edit.output.height}
    </canvas>
  )
}
