/** 必要權限（每一項的用途見 PERMISSIONS.md；research 004 R5） */
export const REQUIRED_PERMISSIONS = [
  'activeTab',
  'contextMenus',
  'sidePanel',
  'storage',
  'scripting',
]

export interface Manifest {
  manifest_version: 3
  name: string
  description: string
  version: string
  permissions?: string[]
  host_permissions?: string[]
  optional_host_permissions?: string[]
  background: { service_worker: string; type: 'module' }
  action: { default_title: string; default_icon?: Record<string, string> }
  side_panel: { default_path: string }
  icons?: Record<string, string>
  commands?: Record<
    string,
    { description: string; suggested_key?: { default: string; mac: string } }
  >
  minimum_chrome_version: string
}

/** 版本號取自 tag（去掉開頭的 v）；Chrome 只接受 1 到 4 段的數字 */
/**
 * opts.e2e：E2E 專用建置（dist-e2e）。自動化測試無法提供 activeTab 需要的使用者操作，
 * 所以加上 <all_urls>；正式套件絕不使用（有測試保證）。
 */
export function buildManifest(tag: string, opts: { e2e?: boolean } = {}): Manifest {
  const version = tag.replace(/^v/, '')
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`版本號格式不正確：${tag}（需要 vX.Y.Z）`)
  return {
    manifest_version: 3,
    name: 'TinyImg',
    description: '截圖、標註、壓縮圖片，全部在你的瀏覽器中完成，不上傳到任何地方。',
    version,
    permissions: [...REQUIRED_PERMISSIONS],
    host_permissions: opts.e2e ? ['<all_urls>'] : [],
    optional_host_permissions: ['<all_urls>'],
    background: { service_worker: 'background.js', type: 'module' },
    action: {
      default_title: '截取目前畫面並以 TinyImg 編輯',
      default_icon: { '128': 'icon-128.png' },
    },
    side_panel: { default_path: 'editor.html' },
    icons: { '128': 'icon-128.png' },
    commands: {
      'capture-visible': {
        description: '截取目前畫面並以 TinyImg 編輯',
        suggested_key: { default: 'Ctrl+Shift+S', mac: 'Command+Shift+S' },
      },
      'capture-region': { description: '框選區域截圖並以 TinyImg 編輯' },
    },
    minimum_chrome_version: '116',
  }
}
