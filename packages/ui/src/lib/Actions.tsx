import { t } from './strings'

export function Actions({
  onCopy,
  onDownload,
}: {
  /** 由呼叫端先送出待處理的編輯，再複製最新的結果 */
  onCopy: () => void | Promise<void>
  onDownload: () => void | Promise<void>
}) {
  return (
    <div className="actions">
      <button
        className="btn primary"
        type="button"
        title={`${t.copy}（⌘/Ctrl+C）`}
        onClick={() => void onCopy()}
      >
        {t.copy}
      </button>
      <button
        className="btn"
        type="button"
        title={`${t.download}（⌘/Ctrl+S）`}
        onClick={() => void onDownload()}
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
