import { flattenAlpha } from './analyze'
import { resolveFormat } from './format'
import { boxResize, fitLongestEdge, nextScale } from './resize'
import { searchQuality } from './search'
import {
  CancelledError,
  MIME,
  type Codecs,
  type CompressRequest,
  type CompressResult,
  type ConcreteFormat,
  type RawImage,
  type SourceInfo,
  type Warning,
} from './types'

const PNG_LADDER: (number | null)[] = [null, 256, 128, 64]

interface Attempt {
  bytes: Uint8Array
  quality: number | null
  colors: number | null
  width: number
  height: number
}

export interface CompressOptions {
  isCancelled?: () => boolean
  /** 縮尺寸時最長邊的下限，預設 320 */
  minEdge?: number
}

/**
 * 把影像壓到 req.targetBytes 以內。
 * 保證：status !== 'unreachable' 時 bytes.length <= targetBytes。
 */
export async function compressToTarget(
  input: RawImage,
  source: SourceInfo & { bytes: Uint8Array },
  req: CompressRequest,
  codecs: Codecs,
  opts: CompressOptions = {},
): Promise<CompressResult> {
  const minEdge = opts.minEdge ?? 320
  const target = req.targetBytes
  const format = resolveFormat(req.format, source.hasAlpha)
  const warnings: Warning[] = []
  if (source.isAnimated) warnings.push('animation-dropped')
  let img = input
  if (format === 'jpeg' && source.hasAlpha) {
    img = flattenAlpha(input)
    warnings.push('alpha-flattened')
  }

  let attempts = 0
  const checkCancel = () => {
    if (opts.isCancelled?.()) throw new CancelledError()
  }
  const finish = (status: CompressResult['status'], a: Attempt): CompressResult => ({
    status,
    bytes: a.bytes,
    mimeType: MIME[format],
    width: a.width,
    height: a.height,
    quality: a.quality,
    colors: a.colors,
    attempts,
    warnings,
  })

  /** 在目前尺寸下嘗試；回傳 { fit, smallest } */
  const tryAtSize = async (
    cur: RawImage,
    firstRound: boolean,
  ): Promise<{ fit: Attempt | null; smallest: Attempt }> => {
    if (format === 'png') {
      let smallest: Attempt | null = null
      // 縮尺寸後的輪次跳過無損：大尺寸時連 64 色都超標，無損版本不可能更小
      for (const colors of firstRound ? PNG_LADDER : PNG_LADDER.slice(1)) {
        checkCancel()
        attempts += 1
        const bytes = await codecs.encodePng(cur, colors)
        const a: Attempt = { bytes, quality: null, colors, width: cur.width, height: cur.height }
        if (!smallest || bytes.length < smallest.bytes.length) smallest = a
        if (bytes.length <= target) return { fit: a, smallest }
      }
      return { fit: null, smallest: smallest! }
    }
    const lossy: 'jpeg' | 'webp' = format
    const r = await searchQuality((q) => codecs.encode(cur, lossy, q), target, req.maxQuality, {
      isCancelled: opts.isCancelled,
    })
    attempts += r.attempts
    const wrap = (e: { bytes: Uint8Array; quality: number }): Attempt => ({
      bytes: e.bytes,
      quality: e.quality,
      colors: null,
      width: cur.width,
      height: cur.height,
    })
    return { fit: r.best ? wrap(r.best) : null, smallest: wrap(r.smallest) }
  }

  const first = await tryAtSize(img, true)

  // 原圖本來就符合目標：重新編碼不比原圖小時，保留原圖
  const sameFormat = req.format === 'auto' || MIME[format] === source.mimeType
  if (source.byteSize <= target && sameFormat && warnings.length === 0) {
    const reencoded = first.fit ?? first.smallest
    if (reencoded.bytes.length >= source.byteSize) {
      return {
        ...finish('original-fits', {
          bytes: source.bytes,
          quality: null,
          colors: null,
          width: source.width,
          height: source.height,
        }),
        mimeType: source.mimeType,
      }
    }
  }
  if (first.fit) return finish('achieved', first.fit)

  let smallest = first.smallest
  let longest = Math.max(img.width, img.height)
  let roundSmallest = first.smallest
  while (longest > minEdge) {
    longest = Math.max(minEdge, Math.round(longest * nextScale(roundSmallest.bytes.length, target)))
    const { width, height } = fitLongestEdge(img.width, img.height, longest)
    checkCancel()
    const resized = codecs.resize
      ? await codecs.resize(img, width, height)
      : boxResize(img, width, height)
    const r = await tryAtSize(resized, false)
    if (r.fit) return finish('achieved', r.fit)
    roundSmallest = r.smallest
    if (r.smallest.bytes.length < smallest.bytes.length) smallest = r.smallest
  }
  return finish('unreachable', smallest)
}

export type { ConcreteFormat }
