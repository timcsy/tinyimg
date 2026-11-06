import { SHARE_INBOX } from './sw-core'

/** 讀取並清空分享收件匣（research 005 R3）；沒有分享時回傳空陣列 */
export async function takeSharedFiles(): Promise<File[]> {
  if (!new URLSearchParams(location.search).has('share') || !('caches' in self)) return []
  const inbox = await caches.open(SHARE_INBOX)
  const keys = await inbox.keys()
  const sorted = [...keys].sort(
    (a, b) => Number(a.url.split('/').pop()) - Number(b.url.split('/').pop()),
  )
  const files: File[] = []
  for (const k of sorted) {
    const res = await inbox.match(k)
    if (!res) continue
    const name = decodeURIComponent(res.headers.get('x-name') ?? 'shared')
    files.push(new File([await res.blob()], name, { type: res.headers.get('content-type') ?? '' }))
  }
  await caches.delete(SHARE_INBOX)
  history.replaceState(null, '', location.pathname)
  return files
}
