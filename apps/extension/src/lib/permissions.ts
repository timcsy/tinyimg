/**
 * 讀取這張圖片需要請求的主機權限（match pattern）；不需要時回傳 null。
 * data:、blob: 與外掛自己的網址不需要權限；不支援的協定回傳 null，交給讀取失敗的錯誤處理。
 */
export function needsHostPermission(src: string, extensionOrigin: string): string | null {
  if (src.startsWith('data:') || src.startsWith('blob:') || src.startsWith(extensionOrigin))
    return null
  let url: URL
  try {
    url = new URL(src)
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  // match pattern 不含連接埠：http://localhost/* 涵蓋所有連接埠
  return `${url.protocol}//${url.hostname}/*`
}
