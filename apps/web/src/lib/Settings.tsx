import type { OutputFormat } from '@tinyimg/core'
import { t } from './strings'
import { validSettings, type Settings } from './workspace'

const FORMATS: OutputFormat[] = ['auto', 'jpeg', 'png', 'webp']

export function SettingsPanel({
  value,
  onChange,
}: {
  value: Settings
  onChange: (s: Settings) => void
}) {
  const invalid = !validSettings(value)
  const update = (patch: Partial<Settings>) => onChange({ ...value, ...patch })
  return (
    <fieldset className="settings">
      <legend className="visually-hidden">壓縮設定</legend>
      <label>
        <span>
          {t.quality}：{value.maxQuality}%
        </span>
        <input
          type="range"
          min={10}
          max={100}
          value={value.maxQuality}
          aria-label={t.quality}
          onChange={(e) => update({ maxQuality: Number(e.currentTarget.value) })}
        />
      </label>
      <label>
        <span>{t.target}</span>
        <input
          type="number"
          min={50}
          max={10240}
          inputMode="numeric"
          value={Number.isFinite(value.targetKB) ? value.targetKB : ''}
          aria-invalid={invalid}
          aria-describedby={invalid ? 'target-error' : undefined}
          onChange={(e) => update({ targetKB: e.currentTarget.valueAsNumber })}
        />
      </label>
      <label>
        <span>{t.format}</span>
        <select
          value={value.format}
          aria-describedby="format-hint"
          onChange={(e) => update({ format: e.currentTarget.value as OutputFormat })}
        >
          {FORMATS.map((f) => (
            <option key={f} value={f}>
              {t.formats[f]}
            </option>
          ))}
        </select>
        <small id="format-hint">{t.formatAutoHint}</small>
      </label>
      {invalid && (
        <p id="target-error" className="settings-error" role="alert">
          {t.targetInvalid}
        </p>
      )}
    </fieldset>
  )
}
