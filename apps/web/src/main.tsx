import { TinyImgApp, type Incoming } from '@tinyimg/ui'
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { takeSharedFiles } from './share-inbox'
import './update-banner.css'

/** 有新版本時顯示提示；不強制重新整理（spec 005 FR-002） */
function useUpdateAvailable() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null)
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return
    // 在頁面載入完成、瀏覽器閒置時才註冊（常見做法：避免預先快取和首次載入搶資源）。
    // 曾嘗試再延後 10 秒，但在高負載機器上的對照實驗被雜訊主導，沒有證據支持（research 005 R5）
    let cancelled = false
    const register = () => {
      if (cancelled) return
      void navigator.serviceWorker.register('./sw.js').then((reg) => {
        const watch = (sw: ServiceWorker | null) => {
          if (!sw) return
          sw.addEventListener('statechange', () => {
            if (sw.state === 'installed' && navigator.serviceWorker.controller) setWaiting(sw)
          })
        }
        if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting)
        reg.addEventListener('updatefound', () => watch(reg.installing))
      })
    }
    const idle = () =>
      'requestIdleCallback' in window
        ? requestIdleCallback(register, { timeout: 5000 })
        : register()
    if (document.readyState === 'complete') idle()
    else window.addEventListener('load', idle, { once: true })
    return () => {
      cancelled = true
      window.removeEventListener('load', idle)
    }
  }, [])
  return waiting
}

function WebApp() {
  const waiting = useUpdateAvailable()
  const [incoming, setIncoming] = useState<Incoming | null>(null)
  const [incomingFiles, setIncomingFiles] = useState<{ files: File[]; key: string } | null>(null)

  // 從系統分享選單進來的圖片：一張進單張編輯器，多張進批次（spec 005 US2）
  useEffect(() => {
    void takeSharedFiles().then((files) => {
      if (files.length === 1) setIncoming({ file: files[0]!, key: `share-${Date.now()}` })
      else if (files.length > 1) setIncomingFiles({ files, key: `share-${Date.now()}` })
    })
  }, [])

  return (
    <>
      {waiting && (
        <div className="update-banner" role="status">
          有新版本。
          <button
            type="button"
            className="btn"
            onClick={() => {
              navigator.serviceWorker.addEventListener('controllerchange', () => location.reload())
              waiting.postMessage('skip-waiting')
            }}
          >
            重新整理以更新
          </button>
        </div>
      )}
      <TinyImgApp incoming={incoming} incomingFiles={incomingFiles} />
    </>
  )
}

const target = document.getElementById('app')
if (!target) throw new Error('找不到 #app')
createRoot(target).render(
  <StrictMode>
    <WebApp />
  </StrictMode>,
)
