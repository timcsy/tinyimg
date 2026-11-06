import { describe, expect, it } from 'vitest'
import { buildManifest, REQUIRED_PERMISSIONS } from '../src/lib/manifest'
import { toCropRect } from '../src/lib/crop'
import { asPending, nextPending } from '../src/lib/pending'
import { readOpenIn } from '../src/lib/settings'
import { needsHostPermission } from '../src/lib/permissions'

describe('buildManifest', () => {
  it('版本號取自 tag，去掉開頭的 v', () => {
    expect(buildManifest('v0.2.0').version).toBe('0.2.0')
    expect(buildManifest('1.4.10').version).toBe('1.4.10')
  })
  it('不合法的版本號會丟出錯誤', () => {
    expect(() => buildManifest('v1.2')).toThrow()
    expect(() => buildManifest('latest')).toThrow()
  })
  it('MV3；必要權限不超過 5 項；主機權限只在 optional（SC-004）', () => {
    const m = buildManifest('0.1.0')
    expect(m.manifest_version).toBe(3)
    expect(m.permissions).toEqual(REQUIRED_PERMISSIONS)
    expect(m.permissions!.length).toBeLessThanOrEqual(5)
    expect(m.host_permissions ?? []).toEqual([])
    expect(m.optional_host_permissions).toEqual(['<all_urls>'])
  })
  it('service worker 為 ES 模組；有截圖命令與建議快捷鍵', () => {
    const m = buildManifest('0.1.0')
    expect(m.background).toEqual({ service_worker: 'background.js', type: 'module' })
    const cmd = m.commands!['capture-visible']!
    expect(cmd.suggested_key).toMatchObject({ default: 'Ctrl+Shift+S', mac: 'Command+Shift+S' })
    expect(m.commands!['capture-region']).toBeTruthy()
  })
  it('側邊欄指向編輯器頁面；沒有 content_security_policy 放寬', () => {
    const m = buildManifest('0.1.0')
    expect(m.side_panel).toEqual({ default_path: 'editor.html' })
    expect(JSON.stringify(m)).not.toMatch(/unsafe-eval|https?:\/\//)
  })
})

describe('buildManifest：E2E 專用的變體', () => {
  it('只有 e2e 選項會加上 <all_urls>（自動化無法提供 activeTab 所需的使用者操作）', () => {
    expect(buildManifest('0.1.0', { e2e: true }).host_permissions).toEqual(['<all_urls>'])
    expect(buildManifest('0.1.0').host_permissions).toEqual([])
  })
})

describe('toCropRect（框選 → 截圖像素）', () => {
  const image = { width: 2560, height: 1600 }
  it('依 dpr 換算並取整數', () => {
    expect(toCropRect({ x: 10.2, y: 20, width: 100, height: 50, dpr: 2 }, image)).toEqual({
      x: 20,
      y: 40,
      width: 200,
      height: 100,
    })
  })
  it('夾在截圖範圍內', () => {
    const r = toCropRect({ x: 1200, y: 700, width: 500, height: 500, dpr: 2 }, image)!
    expect(r.x + r.width).toBeLessThanOrEqual(2560)
    expect(r.y + r.height).toBeLessThanOrEqual(1600)
  })
  it('小於 4 CSS px 視為取消', () => {
    expect(toCropRect({ x: 0, y: 0, width: 3, height: 100, dpr: 2 }, image)).toBeNull()
  })
})

describe('nextPending', () => {
  it('id 遞增；保留來源與名稱', () => {
    const a = nextPending(null, { dataUrl: 'data:a', source: 'visible', name: 'x' })
    const b = nextPending(a, { dataUrl: 'data:b', source: 'region', name: 'y' })
    expect(a.id).toBe(1)
    expect(b).toEqual({ id: 2, dataUrl: 'data:b', source: 'region', name: 'y' })
  })
})

describe('needsHostPermission', () => {
  const ext = 'chrome-extension://abc'
  it.each([
    ['data:image/png;base64,xx', null],
    ['blob:https://example.com/1', null],
    [`${ext}/icon.png`, null],
    ['https://cdn.example.com/a.png?x=1', 'https://cdn.example.com/*'],
    ['http://localhost:4173/a.png', 'http://localhost/*'],
  ])('%s → %s', (src, expected) => expect(needsHostPermission(src, ext)).toBe(expected))
  it('不支援的協定回傳 null（交給讀取失敗的錯誤處理）', () => {
    expect(needsHostPermission('ftp://x/a.png', ext)).toBeNull()
  })
})

describe('readOpenIn（設定的解析）', () => {
  it.each([
    [{ openIn: 'tab' }, 'tab'],
    [{ openIn: 'sidepanel' }, 'sidepanel'],
    [{ openIn: 'popup' }, 'sidepanel'],
    [undefined, 'sidepanel'],
    ['garbage', 'sidepanel'],
  ])('%o → %s', (v, out) => expect(readOpenIn(v)).toBe(out))
})
describe('asPending', () => {
  it('合法的物件原樣回傳；其他回傳 undefined', () => {
    const p = { id: 1, dataUrl: 'data:x', source: 'visible', name: 'n' }
    expect(asPending(p)).toEqual(p)
    expect(asPending({ id: 'x' })).toBeUndefined()
    expect(asPending(null)).toBeUndefined()
  })
})
