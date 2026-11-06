<script lang="ts">
  import type { OutputFormat } from '@tinyimg/core'
  import { t } from './strings'
  import type { Settings } from './workspace'
  import { validSettings } from './workspace'

  let { value, onchange }: { value: Settings; onchange: (s: Settings) => void } = $props()
  const formats: OutputFormat[] = ['auto', 'jpeg', 'png', 'webp']
  const invalid = $derived(!validSettings(value))
  const update = (patch: Partial<Settings>) => onchange({ ...value, ...patch })
</script>

<fieldset class="settings">
  <legend class="visually-hidden">壓縮設定</legend>
  <label>
    <span>{t.quality}：{value.maxQuality}%</span>
    <input
      type="range"
      min="10"
      max="100"
      value={value.maxQuality}
      aria-label={t.quality}
      oninput={(e) => update({ maxQuality: Number(e.currentTarget.value) })}
    />
  </label>
  <label>
    <span>{t.target}</span>
    <input
      type="number"
      min="50"
      max="10240"
      inputmode="numeric"
      value={value.targetKB}
      aria-invalid={invalid}
      aria-describedby={invalid ? 'target-error' : undefined}
      oninput={(e) => update({ targetKB: e.currentTarget.valueAsNumber })}
    />
  </label>
  <label>
    <span>{t.format}</span>
    <select
      value={value.format}
      aria-describedby="format-hint"
      onchange={(e) => update({ format: e.currentTarget.value as OutputFormat })}
    >
      {#each formats as f (f)}
        <option value={f}>{t.formats[f]}</option>
      {/each}
    </select>
    <small id="format-hint">{t.formatAutoHint}</small>
  </label>
  {#if invalid}
    <p id="target-error" class="error" role="alert">{t.targetInvalid}</p>
  {/if}
</fieldset>

<style>
  .settings {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
    margin: 0;
    padding: 1rem;
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }
  label {
    display: grid;
    gap: 0.3rem;
    font-size: 0.95rem;
  }
  input[type='number'],
  select {
    padding: 0.4rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--bg);
    min-width: 0;
  }
  small {
    color: var(--muted);
  }
  .error {
    grid-column: 1 / -1;
    margin: 0;
    color: var(--danger);
  }
</style>
