import type {
  CompressError,
  CompressResult,
  EditState,
  OutputFormat,
  SourceInfo,
} from '@tinyimg/core'
import type { Compressor, Preview } from '@tinyimg/core/client'

export interface Settings {
  /** 10–100 */
  maxQuality: number
  /** 50–10240 */
  targetKB: number
  format: OutputFormat
}

export type WorkspaceState =
  | { kind: 'idle' }
  | { kind: 'invalid' }
  | { kind: 'processing' }
  | { kind: 'done'; source: SourceInfo; result: CompressResult }
  | { kind: 'error'; error: CompressError }

export const validSettings = (s: Settings) =>
  Number.isFinite(s.targetKB) &&
  s.targetKB >= 50 &&
  s.targetKB <= 10240 &&
  Number.isFinite(s.maxQuality) &&
  s.maxQuality >= 10 &&
  s.maxQuality <= 100

/** 工作區狀態機（與框架無關；Svelte 元件以 onChange 同步狀態） */
export function createWorkspace(
  compressor: Compressor,
  onChange: (s: WorkspaceState) => void = () => {},
) {
  let file: File | null = null
  let edit: EditState | undefined
  let lastSettings: Settings | null = null
  const ws = {
    state: { kind: 'idle' } as WorkspaceState,
    get file() {
      return file
    },
    /** onPreview：worker 解碼後回傳預覽點陣圖，主執行緒不必再解碼一次 */
    async setFile(f: File, settings: Settings, onPreview?: (p: Preview) => void) {
      file = f
      edit = undefined
      await run(settings, onPreview)
    },
    async updateSettings(settings: Settings) {
      if (file) await run(settings)
    },
    /** 編輯改變時重新壓縮；之後改設定也沿用這個 edit */
    async setEdit(e: EditState) {
      edit = e
      if (file && lastSettings) await run(lastSettings)
    },
  }
  const set = (s: WorkspaceState) => {
    ws.state = s
    onChange(s)
  }
  async function run(settings: Settings, onPreview?: (p: Preview) => void) {
    if (!file) return
    lastSettings = settings
    if (!validSettings(settings)) return set({ kind: 'invalid' })
    set({ kind: 'processing' })
    try {
      const out = await compressor.compress(
        file,
        {
          maxQuality: settings.maxQuality / 100,
          targetBytes: Math.round(settings.targetKB * 1024),
          format: settings.format,
        },
        edit,
        onPreview,
      )
      if ('superseded' in out) return
      set({ kind: 'done', source: out.source, result: out.result })
    } catch (e) {
      set({ kind: 'error', error: e as CompressError })
    }
  }
  return ws
}
