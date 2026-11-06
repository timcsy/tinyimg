import type { CompressError, CompressResult, SourceInfo } from '@tinyimg/core'
import { createCompressor } from '@tinyimg/core/client'
import { useEffect, useRef, useState } from 'react'
import { runBatch, uniqueNames, type BatchItem } from './batch'
import { downloadName, formatBytes, statusLabel } from './format'
import { downloadResult } from './output'
import type { Settings } from './workspace'
import { createZip } from './zip'

export type Done = { source: SourceInfo; result: CompressResult }
type Item = BatchItem<File, Done>

const STATUS: Record<Item['status'], string> = {
  pending: '等待中',
  processing: '處理中…',
  done: '',
  error: '',
  cancelled: '已取消',
}

/**
 * 批次處理：使用獨立的 compressor，依序處理（不會和單張編輯器互相取代；draft 候選 8）。
 */
export function BatchView({
  files,
  settings,
  onOpen,
  onClose,
  compressFile,
}: {
  files: File[]
  settings: Settings
  onOpen: (file: File) => void
  onClose: () => void
  /** 測試用：注入壓縮函式（預設使用獨立的 compressor） */
  compressFile?: (file: File, settings: Settings) => Promise<Done>
}) {
  const [items, setItems] = useState<Item[]>(() =>
    files.map((file) => ({ file, status: 'pending' })),
  )
  const [finished, setFinished] = useState(false)
  const cancelled = useRef(false)

  useEffect(() => {
    const compressor = createCompressor()
    let alive = true
    cancelled.current = false
    void runBatch(
      files,
      async (file) => {
        if (compressFile) return compressFile(file, settings)
        const out = await compressor.compress(file, {
          maxQuality: settings.maxQuality / 100,
          targetBytes: Math.round(settings.targetKB * 1024),
          format: settings.format,
        })
        if ('superseded' in out) throw { message: '已取消' }
        return out
      },
      {
        isCancelled: () => cancelled.current || !alive,
        onUpdate: (next) => alive && setItems(next),
      },
    ).then((final) => {
      if (!alive) return
      setItems(final)
      setFinished(true)
    })
    return () => {
      alive = false
      compressor.dispose()
    }
  }, [files, settings, compressFile])

  const done = items.filter((i) => i.status === 'done')
  const handled = items.filter((i) => i.status !== 'pending' && i.status !== 'processing').length
  const anyCancelled = items.some((i) => i.status === 'cancelled')

  const downloadZip = () => {
    const names = uniqueNames(
      done.map((i) => downloadName(i.result!.source.name, i.result!.result.mimeType)),
    )
    const zip = createZip(done.map((i, k) => ({ name: names[k]!, data: i.result!.result.bytes })))
    const url = URL.createObjectURL(new Blob([zip as BlobPart], { type: 'application/zip' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'tinyimg-batch.zip'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <section className="batch" aria-label="批次處理">
      <div className="batch-head">
        <p data-testid="batch-progress" role="status" aria-live="polite">
          {anyCancelled && finished ? '已取消：' : finished ? '全部完成：' : '處理中：'}
          {handled} / {items.length}
        </p>
        <div className="actions">
          <button
            type="button"
            className="btn primary"
            disabled={done.length === 0}
            onClick={downloadZip}
          >
            全部下載（{done.length} 張，zip）
          </button>
          {!finished && (
            <button type="button" className="btn" onClick={() => (cancelled.current = true)}>
              取消
            </button>
          )}
          <button type="button" className="btn" onClick={onClose}>
            關閉批次
          </button>
        </div>
      </div>
      <ul className="batch-list">
        {items.map((i, k) => (
          <li key={k} className={`batch-item ${i.status}`}>
            <span className="batch-name">{i.file.name}</span>
            <span className="batch-status">
              {i.status === 'done' && i.result
                ? `${statusLabel(i.result.result.status, i.result.result.bytes.length)} · ${formatBytes(i.result.result.bytes.length)}`
                : i.status === 'error'
                  ? ((i.error as CompressError)?.message ?? '處理失敗')
                  : STATUS[i.status]}
            </span>
            {i.status === 'done' && i.result && (
              <span className="batch-actions">
                <button
                  type="button"
                  className="btn"
                  aria-label={`下載 ${i.file.name}`}
                  onClick={() => downloadResult(i.result!.result, i.result!.source.name)}
                >
                  下載
                </button>
                <button
                  type="button"
                  className="btn"
                  aria-label={`在編輯器開啟 ${i.file.name}`}
                  onClick={() => onOpen(i.file)}
                >
                  編輯
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
