import { identityEdit, type Annotation, type EditState, type Size } from '@tinyimg/core'
import { createDocument, type EditorDocument, type Op } from '@tinyimg/editor'
import { useEffect, useMemo, useRef, useState } from 'react'

export interface EditorView {
  source: Size | null
  edit: EditState | null
  annotations: Annotation[]
  canUndo: boolean
  canRedo: boolean
}

const EMPTY: EditorView = {
  source: null,
  edit: null,
  annotations: [],
  canUndo: false,
  canRedo: false,
}

/** 把 EditorDocument 包成 React 狀態；文件每次變動都通知 onEdit（觸發重新壓縮） */
export function useEditor(onEdit: (s: EditState, annotations: Annotation[]) => void) {
  const [view, setView] = useState<EditorView>(EMPTY)
  const onEditRef = useRef(onEdit)
  useEffect(() => {
    onEditRef.current = onEdit
  }, [onEdit])

  const api = useMemo(() => {
    let doc: EditorDocument | null = null
    const sync = (notify: boolean) => {
      if (!doc) return
      const edit = doc.state()
      const annotations = doc.annotations()
      setView({ source: doc.source, edit, annotations, canUndo: doc.canUndo, canRedo: doc.canRedo })
      if (notify) onEditRef.current(edit, annotations)
    }
    return {
      load(source: Size) {
        doc = createDocument(source)
        sync(false)
      },
      clear() {
        doc = null
        setView(EMPTY)
      },
      push(op: Op) {
        if (!doc) return
        doc.push(op)
        sync(true)
      },
      undo() {
        if (!doc?.canUndo) return
        doc.undo()
        sync(true)
      },
      redo() {
        if (!doc?.canRedo) return
        doc.redo()
        sync(true)
      },
      /** 目前狀態（同步讀取，不必等 React 重新算繪） */
      state(): EditState {
        return doc?.state() ?? identityEdit({ width: 1, height: 1 })
      },
      annotations(): Annotation[] {
        return doc?.annotations() ?? []
      },
    }
  }, [])

  return { ...api, view }
}
