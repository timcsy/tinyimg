/// <reference types="chrome" />
import { TinyImgApp, type Incoming } from '@tinyimg/ui'
import { StrictMode, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { asPending, PENDING_KEY, type PendingImage } from '../lib/pending'
import { readOpenIn } from '../lib/settings'
import { needsHostPermission } from '../lib/permissions'
import './editor.css'

async function toFile(url: string, name: string): Promise<File> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const blob = await res.blob()
  if (!blob.type.startsWith('image/')) throw new Error('不是圖片')
  return new File([blob], name, { type: blob.type })
}
const nameFromUrl = (src: string) => {
  try {
    return decodeURIComponent(new URL(src).pathname.split('/').pop() || 'image') || 'image'
  } catch {
    return 'image'
  }
}

function ExtensionEditor() {
  const [incoming, setIncoming] = useState<Incoming | null>(null)
  const [notice, setNotice] = useState('')
  const [askOrigin, setAskOrigin] = useState<string | null>(null)
  const [openIn, setOpenIn] = useState<'sidepanel' | 'tab'>('sidepanel')
  const lastId = useRef(0)
  const src = new URLSearchParams(location.search).get('src')

  // 截圖：讀取最新的一張，之後監聽更新（只處理 id 更大的，research 004 R3）
  useEffect(() => {
    if (src) return
    const take = async (p: PendingImage | undefined) => {
      if (!p || p.id <= lastId.current) return
      lastId.current = p.id
      if (p.error) {
        setNotice(p.error)
        return
      }
      setNotice('')
      setIncoming({ file: await toFile(p.dataUrl, `${p.name}.png`), key: `pending-${p.id}` })
    }
    void chrome.storage.session.get(PENDING_KEY).then((r) => take(asPending(r[PENDING_KEY])))
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'session' && changes[PENDING_KEY])
        void take(asPending(changes[PENDING_KEY].newValue))
    }
    chrome.storage.onChanged.addListener(onChanged)
    return () => chrome.storage.onChanged.removeListener(onChanged)
  }, [src])

  // 右鍵圖片：需要主機權限時，由使用者按按鈕授權（權限請求必須來自使用者操作）。
  // 授權後讓 attempt 加一，effect 會重新讀取。
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!src) return
    let cancelled = false
    void (async () => {
      const pattern = needsHostPermission(src, location.origin)
      if (pattern && !(await chrome.permissions.contains({ origins: [pattern] }))) {
        if (!cancelled) setAskOrigin(pattern)
        return
      }
      try {
        const file = await toFile(src, nameFromUrl(src))
        if (cancelled) return
        setIncoming({ file, key: `src-${src}-${attempt}` })
        setNotice('')
      } catch {
        if (!cancelled)
          setNotice(
            '無法讀取這張圖片（可能已被移除或網站拒絕存取）。可以改用截圖（Ctrl/Cmd+Shift+S）。',
          )
      }
    })()
    return () => {
      cancelled = true
    }
  }, [src, attempt])

  useEffect(() => {
    void chrome.storage.local
      .get('settings')
      .then(({ settings }) => setOpenIn(readOpenIn(settings)))
  }, [])

  return (
    <>
      <div className="ext-bar">
        <label>
          開啟方式{' '}
          <select
            value={openIn}
            onChange={(e) => {
              const v = e.currentTarget.value as 'sidepanel' | 'tab'
              setOpenIn(v)
              void chrome.storage.local.set({ settings: { openIn: v } })
            }}
          >
            <option value="sidepanel">側邊欄</option>
            <option value="tab">新分頁</option>
          </select>
        </label>
      </div>
      {askOrigin && (
        <div className="ext-notice" role="alert">
          <p>
            要編輯這張圖片，TinyImg 需要讀取 {askOrigin.replace('/*', '')}{' '}
            的圖片。圖片只在你的瀏覽器中處理。
          </p>
          <button
            type="button"
            className="btn primary"
            onClick={async () => {
              const ok = await chrome.permissions.request({ origins: [askOrigin] })
              setAskOrigin(null)
              if (ok) setAttempt((n) => n + 1)
              else setNotice('未取得權限。可以改用截圖（Ctrl/Cmd+Shift+S）。')
            }}
          >
            允許讀取這個網站的圖片
          </button>
        </div>
      )}
      {notice && (
        <p className="ext-notice" role="alert" data-testid="ext-notice">
          {notice}
        </p>
      )}
      <TinyImgApp incoming={incoming} />
    </>
  )
}

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <ExtensionEditor />
  </StrictMode>,
)
