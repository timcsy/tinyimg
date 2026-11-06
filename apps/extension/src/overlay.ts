/**
 * 框選遮罩（內容腳本，以 IIFE 注入）。
 * window.__tinyimgSelect() 回傳選取範圍（CSS 像素與 dpr）；Esc 或範圍太小時回傳 null。
 * 回傳前移除遮罩並等兩個畫面幀，確保截圖裡沒有遮罩。
 */
function select(): Promise<{
  x: number
  y: number
  width: number
  height: number
  dpr: number
} | null> {
  return new Promise((resolve) => {
    const root = document.createElement('div')
    root.setAttribute('data-tinyimg-overlay', '')
    root.setAttribute('role', 'dialog')
    root.setAttribute('aria-label', '拖曳選取截圖範圍，按 Esc 取消')
    Object.assign(root.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '2147483647',
      cursor: 'crosshair',
      background: 'rgba(0,0,0,0.25)',
    })
    const box = document.createElement('div')
    Object.assign(box.style, {
      position: 'fixed',
      border: '2px solid #fff',
      boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)',
      display: 'none',
      pointerEvents: 'none',
    })
    root.appendChild(box)
    document.documentElement.appendChild(root)

    let start: { x: number; y: number } | null = null
    let rect = { x: 0, y: 0, width: 0, height: 0 }
    const finish = (result: typeof rect | null) => {
      root.remove()
      window.removeEventListener('keydown', onKey, true)
      requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          resolve(result ? { ...result, dpr: window.devicePixelRatio } : null),
        ),
      )
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        finish(null)
      }
    }
    window.addEventListener('keydown', onKey, true)
    root.addEventListener('pointerdown', (e) => {
      e.preventDefault()
      start = { x: e.clientX, y: e.clientY }
      root.setPointerCapture?.(e.pointerId)
    })
    root.addEventListener('pointermove', (e) => {
      if (!start) return
      rect = {
        x: Math.min(start.x, e.clientX),
        y: Math.min(start.y, e.clientY),
        width: Math.abs(e.clientX - start.x),
        height: Math.abs(e.clientY - start.y),
      }
      Object.assign(box.style, {
        display: 'block',
        left: `${rect.x}px`,
        top: `${rect.y}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      })
      root.style.background = 'transparent'
    })
    root.addEventListener('pointerup', () => {
      if (!start) return
      finish(rect.width < 4 || rect.height < 4 ? null : rect)
    })
  })
}

;(globalThis as unknown as { __tinyimgSelect: typeof select }).__tinyimgSelect = select
