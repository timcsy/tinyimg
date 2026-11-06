/** 解碼後的 RGBA 像素資料；data.length === width * height * 4 */
export interface RawImage {
  width: number
  height: number
  data: Uint8ClampedArray
}

export type OutputFormat = 'auto' | 'jpeg' | 'png' | 'webp'
export type ConcreteFormat = Exclude<OutputFormat, 'auto'>

export const MIME: Record<ConcreteFormat, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

export interface SourceInfo {
  name: string
  mimeType: string
  byteSize: number
  width: number
  height: number
  hasAlpha: boolean
  isAnimated: boolean
}

export const MIN_TARGET_BYTES = 50 * 1024
export const MAX_TARGET_BYTES = 10240 * 1024

export interface CompressRequest {
  id: number
  /** 50 * 1024 到 10240 * 1024 */
  targetBytes: number
  /** 0.1 到 1.0 */
  maxQuality: number
  format: OutputFormat
}

export type CompressStatus = 'achieved' | 'original-fits' | 'unreachable'
export type Warning = 'alpha-flattened' | 'animation-dropped'

export interface CompressResult {
  status: CompressStatus
  bytes: Uint8Array
  mimeType: string
  width: number
  height: number
  quality: number | null
  colors: number | null
  attempts: number
  warnings: Warning[]
}

export type CompressErrorCode =
  'not-an-image' | 'decode-failed' | 'timeout' | 'invalid-request' | 'internal'

export interface CompressError {
  code: CompressErrorCode
  /** 給使用者看的繁體中文訊息：發生什麼、可以怎麼做 */
  message: string
}

export interface Codecs {
  encode(img: RawImage, format: 'jpeg' | 'webp', quality: number): Promise<Uint8Array>
  /** colors 為 null 代表無損 */
  encodePng(img: RawImage, colors: number | null): Promise<Uint8Array>
  resize?(img: RawImage, width: number, height: number): Promise<RawImage>
}

export class CancelledError extends Error {
  override name = 'CancelledError'
  constructor() {
    super('已被新的請求取代')
  }
}

export function isCompressError(v: unknown): v is CompressError {
  return (
    typeof v === 'object' &&
    v !== null &&
    'code' in v &&
    'message' in v &&
    typeof (v as CompressError).message === 'string'
  )
}
