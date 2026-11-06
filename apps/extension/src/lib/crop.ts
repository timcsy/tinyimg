export interface RegionSelection {
  x: number
  y: number
  width: number
  height: number
  /** devicePixelRatio */
  dpr: number
}

/** 框選範圍（CSS 像素）→ 截圖像素；小於 4 CSS px 視為取消 */
export function toCropRect(
  sel: RegionSelection,
  image: { width: number; height: number },
): { x: number; y: number; width: number; height: number } | null {
  if (sel.width < 4 || sel.height < 4) return null
  const x = Math.max(0, Math.min(image.width - 1, Math.round(sel.x * sel.dpr)))
  const y = Math.max(0, Math.min(image.height - 1, Math.round(sel.y * sel.dpr)))
  const width = Math.max(1, Math.min(image.width - x, Math.round(sel.width * sel.dpr)))
  const height = Math.max(1, Math.min(image.height - y, Math.round(sel.height * sel.dpr)))
  return { x, y, width, height }
}
