import { useRef, useState } from 'react'
import { t } from './strings'

export function DropZone({
  onFiles,
  compact = false,
}: {
  /** 一張或多張；多張時由呼叫端進入批次模式 */
  onFiles: (files: File[]) => void
  compact?: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const pick = (files: FileList | null | undefined) => {
    const list = Array.from(files ?? [])
    if (list.length) onFiles(list)
  }

  return (
    <>
      <div
        className={`dropzone${compact ? ' compact' : ''}${over ? ' over' : ''}`}
        role="button"
        tabIndex={0}
        aria-describedby={compact ? undefined : 'dz-hint'}
        data-testid="dropzone"
        onClick={() => input.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            input.current?.click()
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          pick(e.dataTransfer?.files)
        }}
      >
        <span className="dropzone-label">{compact ? '換一張圖片' : t.dropzone}</span>
        {!compact && (
          <span id="dz-hint" className="dropzone-hint">
            {t.dropzoneHint}
          </span>
        )}
      </div>
      <input
        ref={input}
        className="visually-hidden"
        type="file"
        accept="image/*"
        multiple
        tabIndex={-1}
        aria-hidden="true"
        data-testid="file-input"
        onChange={(e) => {
          pick(e.currentTarget.files)
          e.currentTarget.value = ''
        }}
      />
    </>
  )
}

/** 在整個頁面監聽貼上：取出剪貼簿中所有的圖片檔（多張時進入批次） */
export function imagesFromPaste(e: ClipboardEvent): File[] {
  const items = Array.from(e.clipboardData?.items ?? [])
  const files = items
    .filter((i) => i.kind === 'file' && i.type.startsWith('image/'))
    .map((i) => i.getAsFile())
    .filter((f): f is File => f !== null)
  if (files.length) return files
  return Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith('image/'))
}
