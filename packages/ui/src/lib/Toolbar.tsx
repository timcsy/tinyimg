import { useRef, useState } from 'react'
import type { Command } from './shortcuts'

export type ToolCommand = Command | 'resize' | 'reset'

export function Toolbar({
  canUndo,
  canRedo,
  cropping,
  onCommand,
}: {
  canUndo: boolean
  canRedo: boolean
  cropping: boolean
  onCommand: (c: ToolCommand) => void
}) {
  const items: {
    cmd: ToolCommand
    label: string
    key: string
    icon: string
    disabled?: boolean
  }[] = [
    { cmd: 'crop', label: '裁切', key: 'C', icon: '⛶' },
    { cmd: 'rotate-ccw', label: '逆時針旋轉', key: 'Shift+R', icon: '↺' },
    { cmd: 'rotate-cw', label: '順時針旋轉', key: 'R', icon: '↻' },
    { cmd: 'flip-x', label: '水平翻轉', key: 'F', icon: '⇋' },
    { cmd: 'flip-y', label: '垂直翻轉', key: 'Shift+F', icon: '⇵' },
    { cmd: 'resize', label: '調整尺寸', key: '', icon: '⤡' },
    { cmd: 'undo', label: '復原', key: '⌘/Ctrl+Z', icon: '↶', disabled: !canUndo },
    { cmd: 'redo', label: '重做', key: '⌘/Ctrl+Shift+Z', icon: '↷', disabled: !canRedo },
    { cmd: 'reset', label: '全部還原', key: '', icon: '⟲', disabled: !canUndo },
  ]
  const [focusIndex, setFocusIndex] = useState(0)
  const buttons = useRef<(HTMLButtonElement | null)[]>([])

  // roving tabindex：整個工具列只佔一個 Tab 停駐點，左右方向鍵在按鈕之間移動
  const onKeyDown = (e: React.KeyboardEvent) => {
    const n = items.length
    let next: number
    if (e.key === 'ArrowRight') next = (focusIndex + 1) % n
    else if (e.key === 'ArrowLeft') next = (focusIndex - 1 + n) % n
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = n - 1
    else return
    e.preventDefault()
    setFocusIndex(next)
    buttons.current[next]?.focus()
  }

  return (
    <div className="toolbar" role="toolbar" aria-label="編輯工具" onKeyDown={onKeyDown}>
      {items.map((it, i) => (
        <button
          key={it.cmd}
          ref={(el) => {
            buttons.current[i] = el
          }}
          type="button"
          aria-label={it.label}
          title={it.key ? `${it.label}（${it.key}）` : it.label}
          aria-pressed={it.cmd === 'crop' ? cropping : undefined}
          tabIndex={i === focusIndex ? 0 : -1}
          disabled={it.disabled}
          onFocus={() => setFocusIndex(i)}
          onClick={() => onCommand(it.cmd)}
        >
          <span aria-hidden="true">{it.icon}</span>
        </button>
      ))}
    </div>
  )
}
