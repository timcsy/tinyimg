<script lang="ts">
  import type { CompressResult, SourceInfo } from '@tinyimg/core'
  import { formatBytes, savingLabel, statusLabel } from './format'
  import { t } from './strings'

  let {
    file,
    source,
    result,
    busy,
  }: { file: File; source: SourceInfo | null; result: CompressResult | null; busy: boolean } =
    $props()

  let originalUrl = $state('')
  let resultUrl = $state('')
  $effect(() => {
    const url = URL.createObjectURL(file)
    originalUrl = url
    return () => URL.revokeObjectURL(url)
  })
  $effect(() => {
    if (!result) return
    const url = URL.createObjectURL(new Blob([result.bytes as BlobPart], { type: result.mimeType }))
    resultUrl = url
    return () => URL.revokeObjectURL(url)
  })
  const fmt = (mime: string) => mime.replace('image/', '').toUpperCase()
</script>

<section class="compare" aria-busy={busy} aria-live="polite">
  <figure>
    <figcaption>{t.original}</figcaption>
    <img src={originalUrl} alt={t.original} />
    {#if source}
      <p class="meta">
        <span data-testid="original-size">{formatBytes(source.byteSize)}</span>
        · {source.width}×{source.height}
      </p>
    {/if}
  </figure>
  <figure>
    <figcaption>{t.result}{busy ? `（${t.processing}）` : ''}</figcaption>
    {#if result && source}
      <img src={resultUrl} alt={t.result} />
      <p class="status {result.status}" data-testid="result-status">
        {statusLabel(result.status, result.bytes.length)}
      </p>
      <p class="meta" data-testid="result-meta">
        <span data-testid="result-size">{formatBytes(result.bytes.length)}</span>
        · {result.width}×{result.height} · {fmt(result.mimeType)}
        · <span data-testid="saving">{savingLabel(source.byteSize, result.bytes.length)}</span>
      </p>
      {#if result.warnings.length > 0}
        <ul class="warnings" data-testid="warnings">
          {#each result.warnings as w (w)}
            <li>{t.warnings[w]}</li>
          {/each}
        </ul>
      {/if}
    {:else}
      <p class="meta">{t.processing}</p>
    {/if}
  </figure>
</section>

<style>
  .compare {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 1rem;
  }
  figure {
    margin: 0;
    padding: 1rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    min-width: 0;
  }
  figcaption {
    font-weight: 600;
    margin-bottom: 0.5rem;
  }
  img {
    display: block;
    max-width: 100%;
    max-height: 260px;
    margin: 0 auto;
    object-fit: contain;
  }
  .meta {
    color: var(--muted);
    margin: 0.5rem 0 0;
    overflow-wrap: anywhere;
  }
  .status {
    font-weight: 600;
    margin: 0.75rem 0 0;
  }
  .status.achieved,
  .status.original-fits {
    color: var(--ok);
  }
  .status.unreachable {
    color: var(--warn);
  }
  .warnings {
    margin: 0.5rem 0 0;
    padding-left: 1.2rem;
    color: var(--warn);
  }
</style>
