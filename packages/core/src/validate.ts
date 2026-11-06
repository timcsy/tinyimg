import {
  MAX_TARGET_BYTES,
  MIN_TARGET_BYTES,
  type CompressError,
  type CompressRequest,
} from './types'

const FORMATS = new Set(['auto', 'jpeg', 'png', 'webp'])
const invalid = (detail: string): CompressError => ({
  code: 'invalid-request',
  message: `設定不正確：${detail}。請調整後再試一次。`,
})
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

export function validateRequest(req: unknown): CompressRequest | CompressError {
  if (typeof req !== 'object' || req === null) return invalid('缺少壓縮設定')
  const r = req as Record<string, unknown>
  if (!finite(r.id)) return invalid('缺少請求編號')
  if (
    !finite(r.targetBytes) ||
    r.targetBytes < MIN_TARGET_BYTES ||
    r.targetBytes > MAX_TARGET_BYTES
  )
    return invalid('目標大小必須介於 50 到 10240 KB')
  if (!finite(r.maxQuality) || r.maxQuality < 0.1 || r.maxQuality > 1)
    return invalid('品質上限必須介於 10% 到 100%')
  if (typeof r.format !== 'string' || !FORMATS.has(r.format)) return invalid('不支援的輸出格式')
  return req as CompressRequest
}
