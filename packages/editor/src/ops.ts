import { identityEdit, orientedSize, unorient, type EditState, type Size } from '@tinyimg/core'

export type Op =
  | { type: 'crop'; x: number; y: number; width: number; height: number }
  | { type: 'rotate'; direction: 1 | -1 }
  | { type: 'flip'; axis: 'x' | 'y' }
  | { type: 'resize'; width: number; height: number }
  | { type: 'reset' }

const mod4 = (n: number) => (((n % 4) + 4) % 4) as 0 | 1 | 2 | 3
const swap = (s: Size): Size => ({ width: s.height, height: s.width })

/** 純函式：把一個操作套到標準化狀態上 */
export function applyOp(s: EditState, op: Op, source: Size): EditState {
  switch (op.type) {
    case 'reset':
      return identityEdit(source)
    case 'rotate':
      // 新變換 = Rot^d ∘ (Flip^f ∘ Rot^r)；Rot ∘ Flip = Flip ∘ Rot⁻¹
      return {
        ...s,
        rotation: mod4(s.rotation + (s.flipX ? -op.direction : op.direction)),
        output: swap(s.output),
      }
    case 'flip':
      // FlipY = Rot² ∘ FlipX，且 Rot² 與 Flip 可交換
      return op.axis === 'x'
        ? { ...s, flipX: !s.flipX }
        : { ...s, flipX: !s.flipX, rotation: mod4(s.rotation + 2) }
    case 'resize': {
      const o = orientedSize(s)
      const ok = (v: number, max: number) => Number.isInteger(v) && v >= 1 && v <= max * 4
      if (!ok(op.width, o.width) || !ok(op.height, o.height))
        throw new RangeError('輸出尺寸必須介於 1 px 到目前尺寸的 400%')
      return { ...s, output: { width: op.width, height: op.height } }
    }
    case 'crop': {
      const o = orientedSize(s)
      const kx = o.width / s.output.width
      const ky = o.height / s.output.height
      // 先在輸出座標夾在範圍內
      const x0 = Math.max(0, Math.min(s.output.width, op.x))
      const y0 = Math.max(0, Math.min(s.output.height, op.y))
      const x1 = Math.max(0, Math.min(s.output.width, op.x + op.width))
      const y1 = Math.max(0, Math.min(s.output.height, op.y + op.height))
      const a = unorient(s, { x: x0 * kx, y: y0 * ky })
      const b = unorient(s, { x: x1 * kx, y: y1 * ky })
      const lx = Math.min(s.crop.width - 1, Math.max(0, Math.round(Math.min(a.x, b.x))))
      const ly = Math.min(s.crop.height - 1, Math.max(0, Math.round(Math.min(a.y, b.y))))
      const rx = Math.min(s.crop.width, Math.max(lx + 1, Math.round(Math.max(a.x, b.x))))
      const ry = Math.min(s.crop.height, Math.max(ly + 1, Math.round(Math.max(a.y, b.y))))
      const crop = { x: s.crop.x + lx, y: s.crop.y + ly, width: rx - lx, height: ry - ly }
      const next: EditState = { ...s, crop }
      const no = orientedSize(next)
      const resized = s.output.width !== o.width || s.output.height !== o.height
      return {
        ...next,
        output: resized
          ? { width: Math.max(1, Math.round(x1 - x0)), height: Math.max(1, Math.round(y1 - y0)) }
          : no,
      }
    }
  }
}

export function applyOps(source: Size, ops: Op[], from?: EditState): EditState {
  return ops.reduce((s, op) => applyOp(s, op, source), from ?? identityEdit(source))
}
