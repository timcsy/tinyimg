export type Command =
  | 'crop'
  | 'rotate-cw'
  | 'rotate-ccw'
  | 'flip-x'
  | 'flip-y'
  | 'undo'
  | 'redo'
  | 'copy'
  | 'download'
  | 'help'
  | 'apply-crop'
  | 'cancel-crop'
  | 'delete'
  | 'tool-select'
  | 'tool-pen'
  | 'tool-highlighter'
  | 'tool-arrow'
  | 'tool-rect'
  | 'tool-ellipse'
  | 'tool-text'
  | 'tool-step'
  | 'tool-mosaic'

export interface KeyInput {
  key: string
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  /** 焦點在文字輸入欄位（input、textarea、select、contenteditable） */
  textTarget: boolean
  /** 頁面上有使用者選取的文字 */
  hasSelection: boolean
  mode: 'viewing' | 'cropping'
}

export interface Match {
  command: Command
  preventDefault: boolean
}

const hit = (command: Command): Match => ({ command, preventDefault: true })

/** 註解工具鍵（003） */
const TOOL_KEYS: Record<string, Command> = {
  v: 'tool-select',
  p: 'tool-pen',
  h: 'tool-highlighter',
  a: 'tool-arrow',
  b: 'tool-rect',
  e: 'tool-ellipse',
  t: 'tool-text',
  n: 'tool-step',
  m: 'tool-mosaic',
}

/** 把按鍵對應到命令；回傳 null 代表不攔截，交給瀏覽器處理 */
export function commandFor(e: KeyInput): Match | null {
  const mod = e.metaKey || e.ctrlKey
  const k = e.key.toLowerCase()

  if (mod && k === 's') return hit('download')
  if (e.mode === 'cropping') {
    if (e.key === 'Enter' && !e.textTarget) return hit('apply-crop')
    if (e.key === 'Escape') return hit('cancel-crop')
    if (mod && k === 'z') return hit('cancel-crop')
  }
  if (e.textTarget) return null

  if (mod) {
    if (k === 'z') return hit(e.shiftKey ? 'redo' : 'undo')
    if (k === 'y' && e.ctrlKey) return hit('redo')
    if (k === 'c' && !e.hasSelection) return hit('copy')
    return null
  }
  if (e.altKey) return null
  if (e.key === '?') return hit('help')
  if (e.key === 'Delete' || e.key === 'Backspace') return hit('delete')
  if (e.key === 'Escape') return hit('tool-select')
  if (!e.shiftKey && TOOL_KEYS[k]) return hit(TOOL_KEYS[k])
  if (k === 'c') return hit('crop')
  if (k === 'r') return hit(e.shiftKey ? 'rotate-ccw' : 'rotate-cw')
  if (k === 'f') return hit(e.shiftKey ? 'flip-y' : 'flip-x')
  return null
}

export function isTextTarget(t: unknown): boolean {
  if (!t || typeof t !== 'object') return false
  const el = t as { tagName?: string; isContentEditable?: boolean }
  return (
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT' ||
    el.isContentEditable === true
  )
}

/** 快捷鍵說明（給說明對話框與工具提示使用） */
export const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: 'C', label: '裁切' },
  { keys: 'Enter / Esc', label: '套用 / 取消裁切' },
  { keys: '方向鍵（Shift 加速、Alt 調整大小）', label: '移動裁切框' },
  { keys: 'R', label: '順時針旋轉' },
  { keys: 'Shift + R', label: '逆時針旋轉' },
  { keys: 'F', label: '水平翻轉' },
  { keys: 'Shift + F', label: '垂直翻轉' },
  { keys: '⌘/Ctrl + Z', label: '復原' },
  { keys: '⌘/Ctrl + Shift + Z、Ctrl + Y', label: '重做' },
  { keys: '⌘/Ctrl + C', label: '複製結果' },
  { keys: '⌘/Ctrl + S', label: '下載結果' },
  { keys: 'V', label: '選取註解' },
  { keys: 'P / H', label: '畫筆 / 螢光筆' },
  { keys: 'A / B / E', label: '箭頭 / 矩形 / 橢圓' },
  { keys: 'T / N / M', label: '文字 / 編號 / 馬賽克' },
  { keys: 'Enter（在畫布上）', label: '在中央建立註解' },
  { keys: '方向鍵 / Delete', label: '移動 / 刪除選取的註解' },
  { keys: 'Esc', label: '回到選取工具' },
  { keys: '?', label: '顯示快捷鍵' },
]
