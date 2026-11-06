import type { CompressResult } from '@tinyimg/core'
import type { Compressor } from '@tinyimg/core/client'
import { copyResult, downloadResult } from './output'
import { t } from './strings'

export function Actions({
  result,
  name,
  compressor,
  onNotify,
}: {
  result: CompressResult
  name: string
  compressor: Compressor
  onNotify: (msg: string) => void
}) {
  return (
    <div className="actions">
      <button
        className="btn primary"
        type="button"
        title={`${t.copy}（⌘/Ctrl+C）`}
        onClick={async () => onNotify(await copyResult(compressor, result))}
      >
        {t.copy}
      </button>
      <button
        className="btn"
        type="button"
        title={`${t.download}（⌘/Ctrl+S）`}
        onClick={() => onNotify(downloadResult(result, name))}
      >
        {t.download}
      </button>
    </div>
  )
}

export function Toast({ message }: { message: string }) {
  return (
    <div className="toast" role="status" aria-live="polite">
      {message}
    </div>
  )
}
