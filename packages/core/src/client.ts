import type { EditState } from './edit'
import type { CompressError, CompressRequest, CompressResult, SourceInfo } from './types'
import type { WorkerInMessage, WorkerOutMessage } from './worker'

export interface WorkerLike {
  postMessage(m: WorkerInMessage, transfer?: Transferable[]): void
  terminate(): void
  onmessage: ((e: { data: WorkerOutMessage }) => void) | null
}

export interface Preview {
  source: { width: number; height: number }
  /** 瀏覽器中為 ImageBitmap */
  bitmap: unknown
}

export type CompressOutcome = { source: SourceInfo; result: CompressResult } | { superseded: true }

export interface Compressor {
  compress(
    file: Blob,
    req: Omit<CompressRequest, 'id'>,
    edit?: EditState,
    onPreview?: (p: Preview) => void,
  ): Promise<CompressOutcome>
  toPng(bytes: Uint8Array, mimeType: string): Promise<Uint8Array>
  dispose(): void
}

interface Pending {
  resolve(v: unknown): void
  reject(e: CompressError): void
  onPreview?: (p: Preview) => void
  timer?: ReturnType<typeof setTimeout>
}

const TIMEOUT: CompressError = {
  code: 'timeout',
  message: '處理超過 30 秒仍未完成，已停止。請改用較小的圖片，或提高目標大小後再試。',
}

const defaultWorker = (): WorkerLike =>
  new Worker(new URL('./worker-entry.ts', import.meta.url), {
    type: 'module',
  }) as unknown as WorkerLike

export function createCompressor(
  opts: { timeoutMs?: number; createWorker?: () => WorkerLike } = {},
): Compressor {
  const timeoutMs = opts.timeoutMs ?? 30_000
  const createWorker = opts.createWorker ?? defaultWorker
  const pending = new Map<number, Pending>()
  let nextId = 1
  let currentCompress: number | null = null
  let worker: WorkerLike | null = null

  const ensureWorker = (): WorkerLike => {
    if (worker) return worker
    const w = createWorker()
    w.onmessage = ({ data }) => {
      const p = pending.get(data.id)
      if (!p) return
      if (data.type === 'preview') {
        p.onPreview?.({ source: data.source, bitmap: data.bitmap })
        return
      }
      pending.delete(data.id)
      clearTimeout(p.timer)
      if (data.type === 'error') p.reject(data.error)
      else if (data.type === 'png') p.resolve(new Uint8Array(data.bytes))
      else p.resolve({ source: data.source, result: data.result })
    }
    worker = w
    return w
  }

  const supersede = (id: number) => {
    const p = pending.get(id)
    if (!p) return
    pending.delete(id)
    clearTimeout(p.timer)
    p.resolve({ superseded: true })
  }

  const restart = () => {
    worker?.terminate()
    worker = null
    for (const [id, p] of pending) {
      clearTimeout(p.timer)
      pending.delete(id)
      p.reject(TIMEOUT)
    }
  }

  return {
    compress(file, req, edit, onPreview) {
      if (currentCompress !== null) supersede(currentCompress)
      const id = nextId++
      currentCompress = id
      return new Promise<CompressOutcome>((resolve, reject) => {
        const p: Pending = { resolve: resolve as (v: unknown) => void, reject, onPreview }
        p.timer = setTimeout(restart, timeoutMs)
        pending.set(id, p)
        void file.arrayBuffer().then((bytes) => {
          if (!pending.has(id)) return
          const name = file instanceof File && file.name ? file.name : 'pasted-image'
          ensureWorker().postMessage(
            {
              type: 'compress',
              id,
              file: { name, mimeType: file.type, bytes },
              request: { ...req, id },
              ...(edit ? { edit } : {}),
              ...(onPreview ? { wantPreview: true } : {}),
            },
            [bytes],
          )
        })
      })
    },
    toPng(bytes, mimeType) {
      const id = nextId++
      return new Promise<Uint8Array>((resolve, reject) => {
        const p: Pending = { resolve: resolve as (v: unknown) => void, reject }
        p.timer = setTimeout(restart, timeoutMs)
        pending.set(id, p)
        const copy = bytes.slice().buffer as ArrayBuffer
        ensureWorker().postMessage({ type: 'to-png', id, bytes: copy, mimeType }, [copy])
      })
    },
    dispose() {
      for (const id of [...pending.keys()]) supersede(id)
      worker?.terminate()
      worker = null
    },
  }
}
