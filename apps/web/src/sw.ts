/// <reference lib="webworker" />
// Service worker（research 005 R1、R3）。以 IIFE 單獨建置成傳統腳本（不是 ES 模組），清單與版本在建置時注入。
import { cacheName, routeFor, SHARE_INBOX, staleCaches } from './sw-core'

declare const self: ServiceWorkerGlobalScope
// 由 vite.sw.config.ts 以 define 注入（列出主程式建置後的 dist 檔案）
declare const __TINYIMG_PRECACHE__: string[]
declare const __TINYIMG_VERSION__: string
const PRECACHE = __TINYIMG_PRECACHE__
const CACHE = cacheName(__TINYIMG_VERSION__)
const SCOPE = self.registration.scope

self.addEventListener('install', (event) => {
  // 不呼叫 skipWaiting：新版本等使用者重新整理才生效，不會在編輯途中被換掉（FR-002）
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(staleCaches(keys, CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') void self.skipWaiting()
})

async function fromCache(request: Request | string): Promise<Response> {
  // ignoreVary：模組腳本以 CORS 模式請求（帶 Origin 標頭），預先快取時沒有；若伺服器回應帶 Vary，
  // 快取會比對不到，離線時 JS、CSS 載入失敗。這是 005 E2E 在 Chromium 離線失敗時的推論：
  // 檔案確實在快取裡卻比對不到，加上 ignoreVary 後通過；Vary 標頭本身沒有直接觀察到。
  const cached = await caches.match(request, {
    cacheName: CACHE,
    ignoreSearch: true,
    ignoreVary: true,
  })
  return cached ?? fetch(request)
}

async function handleShare(request: Request): Promise<Response> {
  const form = await request.formData()
  const files = form.getAll('images').filter((f): f is File => f instanceof File)
  await caches.delete(SHARE_INBOX)
  const inbox = await caches.open(SHARE_INBOX)
  await Promise.all(
    files.map((f, i) =>
      inbox.put(
        `${SCOPE}__share/${i}`,
        new Response(f, {
          headers: { 'content-type': f.type, 'x-name': encodeURIComponent(f.name) },
        }),
      ),
    ),
  )
  return Response.redirect(`${SCOPE}?share=${Date.now()}`, 303)
}

self.addEventListener('fetch', (event) => {
  const route = routeFor(event.request, SCOPE)
  if (route === 'share') event.respondWith(handleShare(event.request))
  else if (route === 'navigate')
    event.respondWith(fromCache('index.html').catch(() => fetch(event.request)))
  else if (route === 'precache') event.respondWith(fromCache(event.request))
})
