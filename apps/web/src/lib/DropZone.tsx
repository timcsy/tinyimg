import { useRef, useState } from 'react'
import { t } from './strings'

export function DropZone({
  onFile,
  compact = false,
}: {
  onFile: (f: File) => void
  compact?: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const pick = (files: FileList | null | undefined) => {
    const f = files?.[0]
    if (f) onFile(f)
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

/** 在整個頁面監聽貼上：無論是否已經有圖片，貼上都會放入新圖片 */
export function imageFromPaste(e: ClipboardEvent): File | null {
  const items = Array.from(e.clipboardData?.items ?? [])
  const item = items.find((i) => i.kind === 'file' && i.type.startsWith('image/'))
  return item?.getAsFile() ?? e.clipboardData?.files?.[0] ?? null
}
