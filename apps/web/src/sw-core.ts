/** Service worker 的純函式（research 005 R1）：可以在 Node 測試 */

export const CACHE_PREFIX = 'tinyimg-'
/** 分享目標暫存檔案的快取；不屬於任何版本，不會被當成舊版本刪除 */
export const SHARE_INBOX = 'tinyimg-share-inbox'

export const cacheName = (version: string) => `${CACHE_PREFIX}${version}`

export type Route = 'navigate' | 'precache' | 'share' | 'network'

export function routeFor(
  req: { url: string; method: string; mode: RequestMode },
  scope: string,
): Route {
  if (!req.url.startsWith(scope)) return 'network'
  const path = req.url.slice(scope.length).split('?')[0]
  if (req.method === 'POST' && path === 'share') return 'share'
  if (req.method !== 'GET') return 'network'
  if (req.mode === 'navigate') return 'navigate'
  return 'precache'
}

/** 要預先快取的檔案：建置輸出扣掉 Vite manifest、sourcemap 與 sw.js 本身，並加上根目錄 */
export function precacheList(files: string[]): string[] {
  return [
    './',
    ...files.filter((f) => !f.startsWith('.vite/') && !f.endsWith('.map') && f !== 'sw.js'),
  ]
}

/** 本網站的舊版本快取（保留目前版本與分享收件匣，不碰其他網站的快取） */
export function staleCaches(keys: string[], current: string): string[] {
  return keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== current && k !== SHARE_INBOX)
}
