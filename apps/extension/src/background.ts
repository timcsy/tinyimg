/// <reference types="chrome" />
import { toCropRect, type RegionSelection } from './lib/crop'
import { asPending, nextPending, PENDING_KEY, type PendingImage } from './lib/pending'
import { readOpenIn, type OpenIn } from './lib/settings'

// 預先載入設定：sidePanel.open 必須在使用者操作的同步呼叫內執行，不能先 await 讀設定
let openIn: OpenIn = 'sidepanel'
let changedSinceLoad = false
void chrome.storage.local.get('settings').then(({ settings }) => {
  // 讀取期間設定已經改過時，以較新的變更為準
  if (!changedSinceLoad) openIn = readOpenIn(settings)
})
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.settings) {
    changedSinceLoad = true
    openIn = readOpenIn(changes.settings.newValue)
  }
})

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'tinyimg-edit-image',
    title: '用 TinyImg 編輯',
    contexts: ['image'],
  })
  chrome.contextMenus.create({
    id: 'tinyimg-capture-region',
    title: '框選區域截圖並以 TinyImg 編輯',
    contexts: ['page'],
  })
})

/**
 * 開啟編輯器。
 * - 側邊欄：必須在使用者操作的同步呼叫內開啟（sidePanel.open 的限制），所以要在截圖之前呼叫 openPanel。
 * - 新分頁：必須在截圖之後才開啟，否則新分頁會變成作用中的分頁，截到的是編輯器自己（外掛 E2E 發現）。
 * - 側邊欄開不起來（例如沒有使用者手勢）時，不能什麼都不做：呼叫端在截圖之後改開新分頁
 *   （原則 2；2026-11-07 PR #1 的 CI 發現）。
 *
 * 回傳 null 表示不使用側邊欄；否則回傳「側邊欄是否成功開啟」。
 */
function openPanel(tab: chrome.tabs.Tab, query = ''): Promise<boolean> | null {
  if (openIn !== 'sidepanel' || tab.id === undefined) return null
  const path = `editor.html${query}`
  void chrome.sidePanel.setOptions({ tabId: tab.id, path, enabled: true })
  return chrome.sidePanel.open({ tabId: tab.id }).then(
    () => true,
    () => false,
  )
}
/** 側邊欄沒有開啟時才開新分頁；要在截圖之後呼叫 */
async function openTabUnlessPanel(
  tab: chrome.tabs.Tab,
  panel: Promise<boolean> | null,
  query = '',
) {
  if (!panel || !(await panel)) openTab(tab, query)
}
function openTab(tab: chrome.tabs.Tab, query = '') {
  void chrome.tabs.create({
    url: chrome.runtime.getURL(`editor.html${query}`),
    index: (tab.index ?? 0) + 1,
  })
}
function openEditor(tab: chrome.tabs.Tab, query = '') {
  void openTabUnlessPanel(tab, openPanel(tab, query), query)
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return `data:${blob.type};base64,${btoa(bin)}`
}

async function latest() {
  return asPending((await chrome.storage.session.get(PENDING_KEY))[PENDING_KEY]) ?? null
}

async function store(image: Omit<PendingImage, 'id'>) {
  const prev = await latest()
  try {
    await chrome.storage.session.set({ [PENDING_KEY]: nextPending(prev, image) })
  } catch {
    // 超過 storage.session 的配額：改用 JPEG 再試一次（research 004 R3）
    const bmp = await createImageBitmap(await (await fetch(image.dataUrl)).blob())
    const c = new OffscreenCanvas(bmp.width, bmp.height)
    c.getContext('2d')!.drawImage(bmp, 0, 0)
    const jpeg = await blobToDataUrl(await c.convertToBlob({ type: 'image/jpeg', quality: 0.95 }))
    await chrome.storage.session.set({
      [PENDING_KEY]: nextPending(prev, { ...image, dataUrl: jpeg }),
    })
  }
}

async function notify(message: string) {
  const prev = await latest()
  await chrome.storage.session.set({
    [PENDING_KEY]: nextPending(prev, { dataUrl: '', source: 'visible', name: '', error: message }),
  })
}

const stamp = () => new Date().toISOString().slice(0, 19).replace('T', '-').replaceAll(':', '')
const CANNOT_CAPTURE =
  '這個頁面無法截圖（例如瀏覽器的設定頁或擴充功能商店）。請在一般網頁上再試一次。'

async function capture(tab: chrome.tabs.Tab): Promise<string | null> {
  try {
    return await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' })
  } catch {
    await notify(CANNOT_CAPTURE)
    return null
  }
}

export async function captureVisible(tab: chrome.tabs.Tab) {
  const panel = openPanel(tab)
  const dataUrl = await capture(tab)
  if (dataUrl) await store({ dataUrl, source: 'visible', name: `screenshot-${stamp()}` })
  // 截圖失敗時 capture() 已寫入錯誤訊息；仍開啟編輯器讓使用者看到
  await openTabUnlessPanel(tab, panel)
}

export async function captureRegion(tab: chrome.tabs.Tab) {
  if (tab.id === undefined) return
  // 側邊欄必須在命令當下開啟：等使用者框選完，使用者操作的時效已過，sidePanel.open 會失敗
  const panel = openPanel(tab)
  let selection: RegionSelection | null
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['overlay.js'] })
    const [res] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () =>
        (globalThis as unknown as { __tinyimgSelect: () => Promise<unknown> }).__tinyimgSelect(),
    })
    selection = (res?.result ?? null) as RegionSelection | null
  } catch {
    await notify(CANNOT_CAPTURE)
    await openTabUnlessPanel(tab, panel)
    return
  }
  if (!selection) return // 使用者取消
  const dataUrl = await capture(tab)
  if (!dataUrl) {
    await openTabUnlessPanel(tab, panel)
    return
  }
  const bmp = await createImageBitmap(await (await fetch(dataUrl)).blob())
  const rect = toCropRect(selection, { width: bmp.width, height: bmp.height })
  if (!rect) return
  const c = new OffscreenCanvas(rect.width, rect.height)
  c.getContext('2d')!.drawImage(
    bmp,
    rect.x,
    rect.y,
    rect.width,
    rect.height,
    0,
    0,
    rect.width,
    rect.height,
  )
  const cropped = await blobToDataUrl(await c.convertToBlob({ type: 'image/png' }))
  await store({ dataUrl: cropped, source: 'region', name: `screenshot-${stamp()}` })
  await openTabUnlessPanel(tab, panel)
}

export function editImage(tab: chrome.tabs.Tab, srcUrl: string) {
  openEditor(tab, `?src=${encodeURIComponent(srcUrl)}`)
}

chrome.action.onClicked.addListener((tab) => void captureVisible(tab))
chrome.commands.onCommand.addListener((command, tab) => {
  if (!tab) return
  if (command === 'capture-visible') void captureVisible(tab)
  else if (command === 'capture-region') void captureRegion(tab)
})
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab) return
  if (info.menuItemId === 'tinyimg-edit-image' && info.srcUrl) editImage(tab, info.srcUrl)
  else if (info.menuItemId === 'tinyimg-capture-region') void captureRegion(tab)
})

// 供 E2E 直接呼叫（原生選單與快捷鍵無法自動化；research 004 R6）
;(globalThis as unknown as { tinyimg: unknown }).tinyimg = {
  captureVisible,
  captureRegion,
  editImage,
}
