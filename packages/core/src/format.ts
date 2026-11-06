import type { ConcreteFormat, OutputFormat } from './types'

/** auto：有透明用 PNG（保留透明），否則用 JPEG（照片類有損格式） */
export function resolveFormat(format: OutputFormat, hasAlpha: boolean): ConcreteFormat {
  if (format !== 'auto') return format
  return hasAlpha ? 'png' : 'jpeg'
}
