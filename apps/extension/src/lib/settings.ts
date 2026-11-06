export type OpenIn = 'sidepanel' | 'tab'

/** storage 裡的設定不可信：不合法時退回預設的側邊欄 */
export function readOpenIn(settings: unknown): OpenIn {
  const v = (settings as { openIn?: unknown } | null | undefined)?.openIn
  return v === 'tab' ? 'tab' : 'sidepanel'
}
