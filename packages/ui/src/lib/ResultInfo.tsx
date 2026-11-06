import type { CompressResult, SourceInfo } from '@tinyimg/core'
import { formatBytes, savingLabel, statusLabel } from './format'
import { t } from './strings'

const fmt = (mime: string) => mime.replace('image/', '').toUpperCase()

export function ResultInfo({
  source,
  result,
  busy,
}: {
  source: SourceInfo | null
  result: CompressResult | null
  busy: boolean
}) {
  return (
    <section className="info" aria-busy={busy} aria-live="polite" aria-label="壓縮結果">
      {source && (
        <p className="meta">
          {t.original}：<span data-testid="original-size">{formatBytes(source.byteSize)}</span> ·{' '}
          {source.width}×{source.height}
        </p>
      )}
      {result && source ? (
        <>
          <p className={`status ${result.status}`} data-testid="result-status">
            {statusLabel(result.status, result.bytes.length)}
          </p>
          <p className="meta" data-testid="result-meta">
            {t.result}：<span data-testid="result-size">{formatBytes(result.bytes.length)}</span> ·{' '}
            {result.width}×{result.height} · {fmt(result.mimeType)} ·{' '}
            <span data-testid="saving">{savingLabel(source.byteSize, result.bytes.length)}</span>
          </p>
          {result.warnings.length > 0 && (
            <ul className="warnings" data-testid="warnings">
              {result.warnings.map((w) => (
                <li key={w}>{t.warnings[w]}</li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p className="meta">{t.processing}</p>
      )}
    </section>
  )
}
