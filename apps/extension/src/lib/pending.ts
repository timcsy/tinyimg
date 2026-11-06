export type PendingSource = 'visible' | 'region' | 'context-image'

/** 交給編輯器的圖片；storage.session 只保留最新的一張（research 004 R3） */
export interface PendingImage {
  id: number
  dataUrl: string
  source: PendingSource
  name: string
  /** 無法截圖等情況：沒有圖片，只有給使用者的訊息 */
  error?: string
}

export const PENDING_KEY = 'pending'

export function nextPending(
  prev: PendingImage | null,
  image: Omit<PendingImage, 'id'>,
): PendingImage {
  return { id: (prev?.id ?? 0) + 1, ...image }
}

/** storage 裡的資料不可信：檢查必要欄位 */
export function asPending(v: unknown): PendingImage | undefined {
  const p = v as Partial<PendingImage> | null
  return p && typeof p.id === 'number' && typeof p.dataUrl === 'string'
    ? (p as PendingImage)
    : undefined
}
