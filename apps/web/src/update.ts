/**
 * 註冊 service worker，並在「有新版本等待中」時通知。
 *
 * 只有新 SW 開始安裝（updatefound）的那一刻已經有舊版本在控制頁面時，才算「更新」。不能在「已安裝」
 * 的事件處理當下才看 `controller`：第一次安裝時，新 SW 啟用後會接管頁面（clients.claim），機器慢時「已安裝」事件
 * 可能在接管之後才被處理，這時 `controller` 已經是新 SW，會被誤判成有新版本（E2E 在高負載時抓到）。
 */
export function watchForUpdate(
  container: ServiceWorkerContainer,
  url: string,
  onWaiting: (sw: ServiceWorker) => void,
): () => void {
  let cancelled = false
  void Promise.resolve().then(async () => {
    if (cancelled) return
    const reg = await container.register(url)
    if (cancelled) return
    if (reg.waiting && container.controller !== null) onWaiting(reg.waiting)
    reg.addEventListener('updatefound', () => {
      const sw = reg.installing
      // 第一次安裝時這裡還沒有控制者；之後的更新才有
      if (!sw || container.controller === null) return
      sw.addEventListener('statechange', () => {
        if (!cancelled && sw.state === 'installed') onWaiting(sw)
      })
    })
  })
  return () => {
    cancelled = true
  }
}
