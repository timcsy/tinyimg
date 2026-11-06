import type { CompressStatus } from '@tinyimg/core'
import { t } from './strings'

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  const units = ['KB', 'MB', 'GB']
  let v = n / 1024
  let u = 0
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024
    u++
  }
  return `${parseFloat(v.toFixed(2))} ${units[u]}`
}

/** 結果比原圖小顯示「節省 X%」，比原圖大顯示「增加 X%」，不出現負數 */
export function savingLabel(original: number, result: number): string {
  const pct = (Math.abs(original - result) / original) * 100
  const v = parseFloat(pct.toFixed(1))
  return result > original ? `增加 ${v}%` : `節省 ${v}%`
}

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export function downloadName(name: string, mimeType: string): string {
  const base = name.replace(/\.[^/.]+$/, '')
  return `${base}_compressed.${EXT[mimeType] ?? 'img'}`
}

export function statusLabel(status: CompressStatus, smallestBytes: number): string {
  if (status === 'unreachable')
    return `${t.status.unreachable}（最小 ${formatBytes(smallestBytes)}）`
  return t.status[status]
}
