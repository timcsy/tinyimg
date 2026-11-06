import { hasAlpha, isAnimatedGif } from './analyze'
import { compressToTarget } from './compress'
import { validateRequest } from './validate'
import {
  CancelledError,
  isCompressError,
  type Codecs,
  type CompressError,
  type CompressRequest,
  type CompressResult,
  type RawImage,
  type SourceInfo,
} from './types'

export type WorkerInMessage =
  | {
      type: 'compress'
      id: number
      file: { name: string; mimeType: string; bytes: ArrayBuffer }
      request: CompressRequest
    }
  | { type: 'to-png'; id: number; bytes: ArrayBuffer; mimeType: string }

export type WorkerOutMessage =
  | { type: 'result'; id: number; source: SourceInfo; result: CompressResult }
  | { type: 'png'; id: number; bytes: ArrayBuffer }
  | { type: 'error'; id: number; error: CompressError }

export interface WorkerDeps {
  decode(bytes: Uint8Array, mimeType: string): Promise<RawImage>
  codecs: Codecs
  toPng(bytes: Uint8Array, mimeType: string): Promise<Uint8Array>
}

const ERR = {
  notImage: { code: 'not-an-image', message: '這不是圖片檔。請選擇 JPG、PNG、WebP 或 GIF 圖片。' },
  decode: {
    code: 'decode-failed',
    message:
      '這張圖片無法讀取，可能已損毀或是瀏覽器不支援的格式（例如 HEIC）。請轉成 JPG 或 PNG 後再試。',
  },
  internal: { code: 'internal', message: '處理時發生未預期的錯誤。請重新整理頁面後再試一次。' },
} satisfies Record<string, CompressError>

const toArrayBuffer = (u: Uint8Array): ArrayBuffer =>
  u.byteOffset === 0 && u.byteLength === u.buffer.byteLength && u.buffer instanceof ArrayBuffer
    ? u.buffer
    : (u.slice().buffer as ArrayBuffer)

/** 建立訊息處理函式；與 self 綁定在 worker-entry.ts，方便在 Node 中測試 */
export function createHandler(deps: WorkerDeps) {
  let latest = 0
  return async function handle(msg: WorkerInMessage, post: (m: WorkerOutMessage) => void) {
    if (msg.type === 'to-png') {
      try {
        const png = await deps.toPng(new Uint8Array(msg.bytes), msg.mimeType)
        post({ type: 'png', id: msg.id, bytes: toArrayBuffer(png) })
      } catch {
        post({ type: 'error', id: msg.id, error: ERR.internal })
      }
      return
    }

    const { id, file } = msg
    latest = Math.max(latest, id)
    const isCancelled = () => id !== latest
    const fail = (error: CompressError) => {
      if (!isCancelled()) post({ type: 'error', id, error })
    }

    const req = validateRequest(msg.request)
    if (isCompressError(req)) return fail(req)
    if (file.mimeType && !file.mimeType.startsWith('image/')) return fail(ERR.notImage)

    const bytes = new Uint8Array(file.bytes)
    let img: RawImage
    try {
      img = await deps.decode(bytes, file.mimeType)
    } catch {
      return fail(ERR.decode)
    }
    if (isCancelled()) return

    const source: SourceInfo = {
      name: file.name,
      mimeType: file.mimeType,
      byteSize: bytes.length,
      width: img.width,
      height: img.height,
      hasAlpha: hasAlpha(img),
      isAnimated: file.mimeType === 'image/gif' && isAnimatedGif(bytes),
    }
    try {
      const result = await compressToTarget(img, { ...source, bytes }, req, deps.codecs, {
        isCancelled,
      })
      if (!isCancelled()) post({ type: 'result', id, source, result })
    } catch (e) {
      if (e instanceof CancelledError) return
      fail(ERR.internal)
    }
  }
}
