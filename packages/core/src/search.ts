import { CancelledError } from './types'

export interface Encoded {
  bytes: Uint8Array
  quality: number
}

export interface SearchResult {
  /** 符合目標的最高品質結果；下限仍不符合時為 null */
  best: Encoded | null
  /** 本輪最小的結果（用於估計縮放與 unreachable 回報） */
  smallest: Encoded
  attempts: number
}

const round2 = (q: number) => Math.round(q * 100) / 100

/**
 * 在 [minQuality, maxQuality] 中二分搜尋符合 targetBytes 的最高品質。
 * 先試上限（一次就符合就結束），再試下限，最後最多 5 次二分，總計不超過 7 次。
 */
export async function searchQuality(
  encodeAt: (quality: number) => Promise<Uint8Array>,
  targetBytes: number,
  maxQuality: number,
  opts: { minQuality?: number; isCancelled?: () => boolean } = {},
): Promise<SearchResult> {
  const minQ = Math.min(opts.minQuality ?? 0.3, maxQuality)
  let attempts = 0
  const run = async (q: number): Promise<Encoded> => {
    if (opts.isCancelled?.()) throw new CancelledError()
    attempts += 1
    return { bytes: await encodeAt(q), quality: q }
  }

  const top = await run(maxQuality)
  if (top.bytes.length <= targetBytes) return { best: top, smallest: top, attempts }
  if (minQ >= maxQuality) return { best: null, smallest: top, attempts }

  const bottom = await run(minQ)
  if (bottom.bytes.length > targetBytes) return { best: null, smallest: bottom, attempts }

  let lo = minQ
  let hi = maxQuality
  let best = bottom
  for (let i = 0; i < 5 && hi - lo > 0.02; i++) {
    const mid = round2((lo + hi) / 2)
    if (mid <= lo || mid >= hi) break
    const r = await run(mid)
    if (r.bytes.length <= targetBytes) {
      best = r
      lo = mid
    } else {
      hi = mid
    }
  }
  return { best, smallest: bottom, attempts }
}
