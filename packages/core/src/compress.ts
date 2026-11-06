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

const PNG_COLORS = [256, 128, 64] as const

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
  /** false 時不會回傳原始檔（例如影像已被編輯，原始檔不再代表它） */
  allowOriginal?: boolean
  /**
   * 0 到 1 之間時，直接從「最長邊 × startScale」開始嘗試，跳過原尺寸（spec 007）。
   * 用於同一張圖編輯後重新壓縮：上一次已經證明更大的尺寸放不進目標。其他值一律忽略。
   */
  startScale?: number
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
  const tryAtSize = async (cur: RawImage): Promise<{ fit: Attempt | null; smallest: Attempt }> => {
    if (format === 'png') {
      let smallest: Attempt | null = null
      const encode = async (colors: number | null): Promise<Attempt> => {
        checkCancel()
        attempts += 1
        const bytes = await codecs.encodePng(cur, colors)
        const a: Attempt = { bytes, quality: null, colors, width: cur.width, height: cur.height }
        if (!smallest || bytes.length < smallest.bytes.length) smallest = a
        return a
      }
      // 無損 PNG 幾乎不會比量化後小，所以先試 256 色；256 色符合時才試無損（畫質較好）
      for (const colors of PNG_COLORS) {
        const a = await encode(colors)
        if (a.bytes.length <= target) {
          if (colors === PNG_COLORS[0]) {
            const lossless = await encode(null)
            if (lossless.bytes.length <= target) return { fit: lossless, smallest: smallest! }
          }
          return { fit: a, smallest: smallest! }
        }
        // 減少色數最多只能再省約 25–40%；超過目標 2 倍時追不上，直接縮尺寸
        if (a.bytes.length > target * 2) break
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

  const resizeTo = async (edge: number) => {
    const { width, height } = fitLongestEdge(img.width, img.height, edge)
    checkCancel()
    return codecs.resize ? await codecs.resize(img, width, height) : boxResize(img, width, height)
  }

  let longest = Math.max(img.width, img.height)
  const s = opts.startScale
  const warm = s !== undefined && Number.isFinite(s) && s > 0 && s < 1
  let first: { fit: Attempt | null; smallest: Attempt }
  if (warm) {
    longest = Math.max(minEdge, Math.round(longest * s))
    first = await tryAtSize(await resizeTo(longest))
  } else {
    first = await tryAtSize(img)

    // 原圖本來就符合目標：重新編碼不比原圖小時，保留原圖
    const sameFormat = req.format === 'auto' || MIME[format] === source.mimeType
    if (
      opts.allowOriginal !== false &&
      source.byteSize <= target &&
      sameFormat &&
      warnings.length === 0
    ) {
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
  }
  if (first.fit) return finish('achieved', first.fit)

  let smallest = first.smallest
  let roundSmallest = first.smallest
  while (longest > minEdge) {
    longest = Math.max(minEdge, Math.round(longest * nextScale(roundSmallest.bytes.length, target)))
    const r = await tryAtSize(await resizeTo(longest))
    if (r.fit) return finish('achieved', r.fit)
    roundSmallest = r.smallest
    if (r.smallest.bytes.length < smallest.bytes.length) smallest = r.smallest
  }
  return finish('unreachable', smallest)
}

export type { ConcreteFormat }
