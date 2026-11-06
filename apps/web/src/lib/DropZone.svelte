<script lang="ts">
  import { t } from './strings'

  let { onfile }: { onfile: (file: File) => void } = $props()
  let input: HTMLInputElement
  let over = $state(false)

  function pick(files: FileList | null | undefined) {
    const f = files?.[0]
    if (f) onfile(f)
  }
  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      input.click()
    }
  }
  function onpaste(e: ClipboardEvent) {
    const items = Array.from(e.clipboardData?.items ?? [])
    const item = items.find((i) => i.kind === 'file' && i.type.startsWith('image/'))
    const f = item?.getAsFile() ?? e.clipboardData?.files?.[0]
    if (f) {
      e.preventDefault()
      onfile(f)
    }
  }
</script>

<svelte:document {onpaste} />

<div
  class="zone"
  class:over
  role="button"
  tabindex="0"
  aria-describedby="dz-hint"
  data-testid="dropzone"
  onclick={() => input.click()}
  {onkeydown}
  ondragover={(e) => {
    e.preventDefault()
    over = true
  }}
  ondragleave={() => (over = false)}
  ondrop={(e) => {
    e.preventDefault()
    over = false
    pick(e.dataTransfer?.files)
  }}
>
  <span class="label">{t.dropzone}</span>
  <span id="dz-hint" class="hint">{t.dropzoneHint}</span>
</div>
<input
  bind:this={input}
  class="visually-hidden"
  type="file"
  accept="image/*"
  tabindex="-1"
  aria-hidden="true"
  data-testid="file-input"
  onchange={(e) => {
    const el = e.currentTarget
    pick(el.files)
    el.value = ''
  }}
/>

<style>
  .zone {
    display: grid;
    gap: 0.4rem;
    place-items: center;
    text-align: center;
    padding: 2.5rem 1rem;
    border: 2px dashed var(--border);
    border-radius: var(--radius);
    background: var(--surface);
    cursor: pointer;
  }
  .zone:hover,
  .zone.over {
    border-color: var(--accent);
  }
  .label {
    font-weight: 600;
    font-size: 1.1rem;
  }
  .hint {
    color: var(--muted);
    font-size: 0.9rem;
  }
</style>
