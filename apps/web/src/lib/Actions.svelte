<script lang="ts">
  import type { CompressResult } from '@tinyimg/core'
  import type { Compressor } from '@tinyimg/core/client'
  import { downloadName } from './format'
  import { t } from './strings'

  let {
    result,
    name,
    compressor,
    onnotify,
  }: {
    result: CompressResult
    name: string
    compressor: Compressor
    onnotify: (msg: string) => void
  } = $props()

  async function copy() {
    if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
      onnotify(t.copyUnsupported)
      return
    }
    try {
      // 以 Promise 形式建立 ClipboardItem，Safari 才會保留使用者手勢
      const png = compressor
        .toPng(result.bytes, result.mimeType)
        .then((b) => new Blob([b as BlobPart], { type: 'image/png' }))
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })])
      onnotify(t.copied)
    } catch {
      onnotify(t.copyFailed)
    }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([result.bytes as BlobPart], { type: result.mimeType }))
    const a = document.createElement('a')
    a.href = url
    a.download = downloadName(name, result.mimeType)
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    onnotify(t.downloaded)
  }
</script>

<div class="actions">
  <button class="primary" type="button" onclick={copy}>{t.copy}</button>
  <button type="button" onclick={download}>{t.download}</button>
</div>

<style>
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }
  button {
    padding: 0.7rem 1.2rem;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--bg);
    cursor: pointer;
    font-weight: 600;
  }
  .primary {
    background: var(--accent);
    color: var(--accent-text);
    border-color: var(--accent);
  }
</style>
