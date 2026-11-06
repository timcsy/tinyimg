import { identityEdit, type Annotation, type EditState, type Size } from '@tinyimg/core'
import { applyDocOp, applyDocOps, type DocState, type Op } from './ops'

const MAX_STEPS = 100
const OP_TYPES = new Set([
  'crop',
  'rotate',
  'flip',
  'resize',
  'reset',
  'annotate-add',
  'annotate-update',
  'annotate-remove',
])

export interface EditorDocument {
  readonly source: Size
  readonly canUndo: boolean
  readonly canRedo: boolean
  push(op: Op): void
  undo(): void
  redo(): void
  /** 目前的編輯狀態（裁切、旋轉、翻轉、尺寸） */
  state(): EditState
  /** 目前的註解（原圖座標） */
  annotations(): Annotation[]
  /** 序列化用的內部表示 */
  snapshot(): {
    version: 1
    source: Size
    base: EditState
    baseAnnotations: Annotation[]
    ops: Op[]
    cursor: number
  }
}

/** base：超過 100 步時，最舊的步驟併入這個基準狀態 */
export function createDocument(
  source: Size,
  init?: { base: DocState; ops: Op[]; cursor: number },
): EditorDocument {
  let base: DocState = init?.base ?? { edit: identityEdit(source), annotations: [] }
  let ops = init?.ops ?? []
  let cursor = init?.cursor ?? 0
  const current = () => applyDocOps(source, ops.slice(0, cursor), base)
  return {
    source,
    get canUndo() {
      return cursor > 0
    },
    get canRedo() {
      return cursor < ops.length
    },
    push(op) {
      // 先驗證（例如 resize 範圍、註解 id），不合法時丟出錯誤、不改變歷史
      applyDocOp(current(), op, source)
      ops = [...ops.slice(0, cursor), op]
      cursor = ops.length
      if (ops.length > MAX_STEPS) {
        const overflow = ops.length - MAX_STEPS
        base = applyDocOps(source, ops.slice(0, overflow), base)
        ops = ops.slice(overflow)
        cursor = ops.length
      }
    },
    undo() {
      if (cursor > 0) cursor--
    },
    redo() {
      if (cursor < ops.length) cursor++
    },
    state() {
      return current().edit
    },
    annotations() {
      return current().annotations
    },
    snapshot() {
      return {
        version: 1,
        source,
        base: base.edit,
        baseAnnotations: base.annotations,
        ops: [...ops],
        cursor,
      }
    },
  }
}

export function serialize(doc: EditorDocument): string {
  return JSON.stringify(doc.snapshot())
}

export function deserialize(json: string): EditorDocument {
  const d = JSON.parse(json) as Record<string, unknown>
  const source = d.source as Size | undefined
  if (
    d.version !== 1 ||
    !source ||
    !Number.isInteger(source.width) ||
    !Number.isInteger(source.height)
  )
    throw new Error('不支援的文件格式')
  const ops = d.ops
  if (!Array.isArray(ops) || !ops.every((o) => OP_TYPES.has((o as Op)?.type)))
    throw new Error('文件中有不合法的操作')
  const cursor = d.cursor
  if (typeof cursor !== 'number' || !Number.isInteger(cursor) || cursor < 0 || cursor > ops.length)
    throw new Error('文件游標不合法')
  const base: DocState = {
    edit: (d.base as EditState | undefined) ?? identityEdit(source),
    annotations: (d.baseAnnotations as Annotation[] | undefined) ?? [],
  }
  const doc = createDocument(source, { base, ops: ops as Op[], cursor })
  doc.state() // 重播一次，確保每個操作都合法
  return doc
}
