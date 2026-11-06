<script lang="ts">
  import { createCompressor } from '@tinyimg/core/client'
  import { onDestroy } from 'svelte'
  import Actions from './lib/Actions.svelte'
  import Comparison from './lib/Comparison.svelte'
  import DropZone from './lib/DropZone.svelte'
  import SettingsPanel from './lib/Settings.svelte'
  import Toast from './lib/Toast.svelte'
  import { t } from './lib/strings'
  import { createWorkspace, type Settings, type WorkspaceState } from './lib/workspace'

  const compressor = createCompressor()
  let view = $state<WorkspaceState>({ kind: 'idle' })
  let file = $state<File | null>(null)
  let last = $state<Extract<WorkspaceState, { kind: 'done' }> | null>(null)
  let settings = $state<Settings>({ maxQuality: 80, targetKB: 1024, format: 'auto' })
  let toast = $state('')
  const ws = createWorkspace(compressor, (s) => {
    view = s
    if (s.kind === 'done') last = s
  })
  onDestroy(() => compressor.dispose())

  let timer: ReturnType<typeof setTimeout> | undefined
  function onSettings(s: Settings) {
    settings = s
    clearTimeout(timer)
    timer = setTimeout(() => void ws.updateSettings($state.snapshot(settings)), 300)
  }
  function onFile(f: File) {
    file = f
    last = null
    toast = ''
    void ws.setFile(f, $state.snapshot(settings))
  }
</script>

<main>
  <header>
    <h1>{t.title}</h1>
    <p>{t.tagline}</p>
  </header>

  <DropZone onfile={onFile} />
  <SettingsPanel value={settings} onchange={onSettings} />

  {#if view.kind === 'error'}
    <p class="error" role="alert" data-testid="error">{view.error.message}</p>
  {/if}

  {#if file && view.kind !== 'error'}
    <Comparison
      {file}
      source={last?.source ?? null}
      result={last?.result ?? null}
      busy={view.kind === 'processing'}
    />
    {#if last}
      <Actions
        result={last.result}
        name={last.source.name}
        {compressor}
        onnotify={(m) => (toast = m)}
      />
    {/if}
  {/if}
  <Toast message={toast} />

  <footer>{t.privacy}</footer>
</main>

<style>
  main {
    display: grid;
    gap: 1.25rem;
    max-width: 960px;
    margin: 0 auto;
    padding: 1.5rem 16px 3rem;
  }
  header h1 {
    margin: 0;
    font-size: 1.6rem;
  }
  header p,
  footer {
    margin: 0.25rem 0 0;
    color: var(--muted);
  }
  .error {
    margin: 0;
    padding: 0.75rem 1rem;
    border: 1px solid var(--danger);
    border-radius: var(--radius);
    color: var(--danger);
  }
</style>
