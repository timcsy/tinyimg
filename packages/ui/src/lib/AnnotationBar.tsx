import { KIND_NAME, PALETTE } from '@tinyimg/editor'
import type { AnnotationStyle, Tool } from './AnnotationLayer'

const TOOLS: { tool: Tool; key: string; icon: string }[] = [
  { tool: 'select', key: 'V', icon: '↖' },
  { tool: 'pen', key: 'P', icon: '✎' },
  { tool: 'highlighter', key: 'H', icon: '▬' },
  { tool: 'arrow', key: 'A', icon: '➚' },
  { tool: 'rect', key: 'B', icon: '▭' },
  { tool: 'ellipse', key: 'E', icon: '◯' },
  { tool: 'text', key: 'T', icon: 'T' },
  { tool: 'step', key: 'N', icon: '①' },
  { tool: 'mosaic', key: 'M', icon: '▦' },
]
export const WIDTHS: { value: number; name: string }[] = [
  { value: 2, name: '細' },
  { value: 4, name: '中' },
  { value: 8, name: '粗' },
]
const toolName = (t: Tool) => (t === 'select' ? '選取' : KIND_NAME[t])

export function AnnotationBar({
  tool,
  style,
  onTool,
  onStyle,
}: {
  tool: Tool
  style: AnnotationStyle
  onTool: (t: Tool) => void
  onStyle: (s: AnnotationStyle) => void
}) {
  return (
    <div className="annotation-bar">
      <div role="group" aria-label="註解工具" className="tool-group">
        {TOOLS.map((t) => (
          <button
            key={t.tool}
            type="button"
            aria-label={toolName(t.tool)}
            title={`${toolName(t.tool)}（${t.key}）`}
            aria-pressed={tool === t.tool}
            onClick={() => onTool(t.tool)}
          >
            <span aria-hidden="true">{t.icon}</span>
          </button>
        ))}
      </div>
      <div role="group" aria-label="顏色" className="swatches">
        {PALETTE.map((c) => (
          <button
            key={c.value}
            type="button"
            className="swatch"
            aria-label={c.name}
            aria-pressed={style.color === c.value}
            style={{ background: c.value }}
            onClick={() => onStyle({ ...style, color: c.value })}
          />
        ))}
      </div>
      <div role="group" aria-label="粗細" className="widths">
        {WIDTHS.map((w) => (
          <button
            key={w.value}
            type="button"
            aria-pressed={style.width === w.value}
            onClick={() => onStyle({ ...style, width: w.value })}
          >
            {w.name}
          </button>
        ))}
      </div>
    </div>
  )
}
