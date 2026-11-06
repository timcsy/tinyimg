/**
 * 註冊 service worker，並在「有新版本等待中」時通知。
 *
 * 一個 SW 只有在它開始安裝時，registration 已經有啟用中的舊版本，才算「更新」。
 * 註冊完成時如果還沒有啟用中的 SW，那時正在安裝（或等待）的就是第一次安裝，永遠不算更新。
 *
 * 不能用「事件到達時有沒有 controller」來判斷：Firefox 會把 updatefound 延後送到頁面，
 * 到達時第一次安裝的 SW 早已啟用並接管頁面（2026-11-07 在 E2E 中用 performance.mark 觀察到，
 * 見 knowledge/episodes/2026-11-07-Firefox誤報有新版本.md）。
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
    // 註冊完成時沒有啟用中的 SW：正在安裝或等待的那一個是第一次安裝
    const firstInstall = reg.active ? null : (reg.installing ?? reg.waiting)
    if (reg.active && reg.waiting) onWaiting(reg.waiting)
    reg.addEventListener('updatefound', () => {
      const sw = reg.installing
      if (!sw || sw === firstInstall) return
      // 沒有啟用中的舊版本，也沒有控制者：還是第一次安裝（例如註冊完成後才開始安裝）
      if (!reg.active && container.controller === null) return
      sw.addEventListener('statechange', () => {
        if (!cancelled && sw.state === 'installed') onWaiting(sw)
      })
    })
  })
  return () => {
    cancelled = true
  }
}
