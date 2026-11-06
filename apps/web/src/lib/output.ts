import type { CompressResult } from '@tinyimg/core'
import type { Compressor } from '@tinyimg/core/client'
import { downloadName } from './format'
import { t } from './strings'

/**
 * 把結果以 PNG 寫入剪貼簿。result 可以是尚未完成的 Promise：
 * ClipboardItem 接受 Promise，瀏覽器會保留使用者手勢，等結果完成後才寫入（Safari 也需要這種寫法）。
 */
export async function copyResult(
  compressor: Compressor,
  result: CompressResult | Promise<CompressResult>,
): Promise<string> {
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') return t.copyUnsupported
  try {
    const png = Promise.resolve(result)
      .then((r) => compressor.toPng(r.bytes, r.mimeType))
      .then((b) => new Blob([b as BlobPart], { type: 'image/png' }))
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })])
    return t.copied
  } catch {
    return t.copyFailed
  }
}

export function downloadResult(result: CompressResult, name: string): string {
  const url = URL.createObjectURL(new Blob([result.bytes as BlobPart], { type: result.mimeType }))
  const a = document.createElement('a')
  a.href = url
  a.download = downloadName(name, result.mimeType)
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return t.downloaded
}
