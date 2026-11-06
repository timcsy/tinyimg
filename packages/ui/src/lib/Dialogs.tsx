import type { Size } from '@tinyimg/core'
import { useEffect, useRef, useState } from 'react'
import { SHORTCUTS } from './shortcuts'

/** 以原生 <dialog> 實作，焦點管理與 Esc 關閉由瀏覽器處理 */
function useModal(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    else if (!open && d.open) d.close()
  }, [open])
  return ref
}

export function ResizeDialog({
  open,
  current,
  oriented,
  onApply,
  onClose,
}: {
  open: boolean
  current: Size
  oriented: Size
  onApply: (s: Size) => void
  onClose: () => void
}) {
  const ref = useModal(open)
  const [width, setWidth] = useState(current.width)
  const [height, setHeight] = useState(current.height)
  const [keep, setKeep] = useState(true)
  const [wasOpen, setWasOpen] = useState(open)
  // 每次開啟時以目前尺寸為初始值
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setWidth(current.width)
      setHeight(current.height)
    }
  }
  const ratio = oriented.width / oriented.height
  const valid =
    Number.isInteger(width) &&
    Number.isInteger(height) &&
    width >= 1 &&
    height >= 1 &&
    width <= oriented.width * 4 &&
    height <= oriented.height * 4
  const setW = (w: number) => {
    setWidth(w)
    if (keep && Number.isFinite(w)) setHeight(Math.max(1, Math.round(w / ratio)))
  }
  const setH = (h: number) => {
    setHeight(h)
    if (keep && Number.isFinite(h)) setWidth(Math.max(1, Math.round(h * ratio)))
  }
  const pct = (p: number) => {
    setWidth(Math.max(1, Math.round((oriented.width * p) / 100)))
    setHeight(Math.max(1, Math.round((oriented.height * p) / 100)))
  }
  return (
    <dialog ref={ref} className="dialog" aria-labelledby="resize-title" onClose={onClose}>
      <form
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault()
          if (valid) onApply({ width, height })
        }}
      >
        <h2 id="resize-title">調整尺寸</h2>
        <label>
          寬度（px）
          <input
            type="number"
            value={Number.isFinite(width) ? width : ''}
            onChange={(e) => setW(e.currentTarget.valueAsNumber)}
          />
        </label>
        <label>
          高度（px）
          <input
            type="number"
            value={Number.isFinite(height) ? height : ''}
            onChange={(e) => setH(e.currentTarget.valueAsNumber)}
          />
        </label>
        <label className="row">
          <input
            type="checkbox"
            checked={keep}
            onChange={(e) => setKeep(e.currentTarget.checked)}
          />{' '}
          維持比例
        </label>
        <div className="row">
          {[25, 50, 75, 100].map((p) => (
            <button key={p} type="button" className="btn" onClick={() => pct(p)}>
              {p}%
            </button>
          ))}
        </div>
        {!valid && (
          <p role="alert">
            尺寸必須介於 1 px 到目前尺寸的 400%（{oriented.width * 4} × {oriented.height * 4}）
          </p>
        )}
        <div className="row end">
          <button type="button" className="btn" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="btn primary" disabled={!valid}>
            套用
          </button>
        </div>
      </form>
    </dialog>
  )
}

export function ShortcutHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useModal(open)
  return (
    <dialog ref={ref} className="dialog" aria-labelledby="help-title" onClose={onClose}>
      <h2 id="help-title">快捷鍵</h2>
      <table>
        <tbody>
          {SHORTCUTS.map((s) => (
            <tr key={s.label}>
              <th scope="row">
                <kbd>{s.keys}</kbd>
              </th>
              <td>{s.label}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <form method="dialog">
        <button className="btn">關閉</button>
      </form>
    </dialog>
  )
}
