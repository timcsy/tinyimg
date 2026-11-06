export type BatchStatus = 'pending' | 'processing' | 'done' | 'error' | 'cancelled'

export interface BatchItem<F, R> {
  file: F
  status: BatchStatus
  result?: R
  error?: unknown
}

/**
 * 依序處理每一個檔案（同一時間只處理一個，避免記憶體不足）；某一張失敗不影響其他。
 * 取消後不再開始新的項目，已完成的保留（spec 005 FR-006、FR-008）。
 */
export async function runBatch<F, R>(
  files: F[],
  process: (file: F) => Promise<R>,
  opts: { isCancelled?: () => boolean; onUpdate?: (items: BatchItem<F, R>[]) => void } = {},
): Promise<BatchItem<F, R>[]> {
  const items: BatchItem<F, R>[] = files.map((file) => ({ file, status: 'pending' }))
  const emit = () => opts.onUpdate?.(items.map((i) => ({ ...i })))
  for (const item of items) {
    if (opts.isCancelled?.()) {
      item.status = 'cancelled'
      continue
    }
    item.status = 'processing'
    emit()
    try {
      item.result = await process(item.file)
      item.status = 'done'
    } catch (e) {
      item.error = e
      item.status = 'error'
    }
    emit()
  }
  return items
}

/** 重複的檔名加上序號：a.jpg、a (2).jpg、a (3).jpg */
export function uniqueNames(names: string[]): string[] {
  const seen = new Map<string, number>()
  return names.map((n) => {
    const count = (seen.get(n) ?? 0) + 1
    seen.set(n, count)
    if (count === 1) return n
    const dot = n.lastIndexOf('.')
    return dot > 0 ? `${n.slice(0, dot)} (${count})${n.slice(dot)}` : `${n} (${count})`
  })
}
