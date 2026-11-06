import { orientedSize, type CompressResult } from '@tinyimg/core'
import { createCompressor } from '@tinyimg/core/client'
import { initialBox, ratioValue, RATIOS, type Box, type RatioOption } from '@tinyimg/editor'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Actions, Toast } from './lib/Actions'
import { CompareSlider } from './lib/CompareSlider'
import { CropOverlay } from './lib/CropOverlay'
import { ResizeDialog, ShortcutHelp } from './lib/Dialogs'
import { DropZone, imageFromPaste } from './lib/DropZone'
import { EditorCanvas } from './lib/EditorCanvas'
import { ResultInfo } from './lib/ResultInfo'
import { SettingsPanel } from './lib/Settings'
import { Toolbar, type ToolCommand } from './lib/Toolbar'
import { copyResult, downloadResult } from './lib/output'
import { commandFor, isTextTarget } from './lib/shortcuts'
import { t } from './lib/strings'
import { useEditor } from './lib/useEditor'
import { createWorkspace, type Settings, type WorkspaceState } from './lib/workspace'

type Done = Extract<WorkspaceState, { kind: 'done' }> & { url: string }

const RATIO_LABEL: Record<RatioOption, string> = {
  free: '自由',
  original: '原始比例',
  '1:1': '1:1',
  '4:3': '4:3',
  '3:2': '3:2',
  '16:9': '16:9',
}

export default function App() {
  const [compressor] = useState(() => createCompressor())
  const [view, setView] = useState<WorkspaceState>({ kind: 'idle' })
  const [last, setLast] = useState<Done | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [settings, setSettings] = useState<Settings>({
    maxQuality: 80,
    targetKB: 1024,
    format: 'auto',
  })
  const [toast, setToast] = useState('')
  const [preview, setPreview] = useState<ImageBitmap | null>(null)
  const [mode, setMode] = useState<'viewing' | 'cropping'>('viewing')
  const [cropBox, setCropBox] = useState<Box>({ x: 0, y: 0, width: 1, height: 1 })
  const [ratioOpt, setRatioOpt] = useState<RatioOption>('free')
  const [resizeOpen, setResizeOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [compare, setCompare] = useState(50)

  // 工作區控制器：在初始化函式內以閉包保存狀態，不需要 ref，也不在 effect 裡 setState
  const [ctl] = useState(() => {
    let waiters: { resolve: (r: CompressResult) => void; reject: (e: unknown) => void }[] = []
    let view: WorkspaceState = { kind: 'idle' }
    let done: Done | null = null
    const replaceDone = (next: Done | null) => {
      if (done) URL.revokeObjectURL(done.url)
      done = next
      setLast(next)
    }
    const ws = createWorkspace(compressor, (s) => {
      view = s
      setView(s)
      if (s.kind === 'done') {
        const blob = new Blob([s.result.bytes as BlobPart], { type: s.result.mimeType })
        replaceDone({ ...s, url: URL.createObjectURL(blob) })
        waiters.forEach((w) => w.resolve(s.result))
        waiters = []
      } else if (s.kind === 'error') {
        waiters.forEach((w) => w.reject(s.error))
        waiters = []
      }
    })
    return {
      ws,
      clearResult: () => replaceDone(null),
      lastDone: () => done,
      /** 目前的結果；處理中時等待下一個完成的結果（讓 ⌘C 在處理中按下也能複製） */
      result(): CompressResult | Promise<CompressResult> {
        if (view.kind === 'done' && done) return done.result
        return new Promise((resolve, reject) => waiters.push({ resolve, reject }))
      },
    }
  })
  const ws = ctl.ws

  const editTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const editor = useEditor(
    useCallback(
      (edit) => {
        clearTimeout(editTimer.current)
        editTimer.current = setTimeout(() => void ws.setEdit(edit), 200)
      },
      [ws],
    ),
  )
  const { view: ed } = editor

  useEffect(
    () => () => {
      compressor.dispose()
      ctl.clearResult()
    },
    [compressor, ctl],
  )
  useEffect(() => () => preview?.close(), [preview])

  const settingsTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const onSettings = (s: Settings) => {
    setSettings(s)
    clearTimeout(settingsTimer.current)
    settingsTimer.current = setTimeout(() => void ws.updateSettings(s), 300)
  }

  const loadToken = useRef(0)
  const onFile = useCallback(
    (f: File) => {
      const token = ++loadToken.current
      setFile(f)
      ctl.clearResult()
      setToast('')
      setMode('viewing')
      editor.clear()
      setPreview(null)
      // 預覽由 worker 解碼時一併產生並轉移過來，主執行緒不再解碼（避免同一張圖解碼兩次）
      void ws.setFile(f, settings, ({ source, bitmap }) => {
        const bmp = bitmap as ImageBitmap
        if (token !== loadToken.current) return bmp.close()
        setPreview(bmp)
        editor.load(source)
      })
    },
    [ctl, editor, settings, ws],
  )

  // 整個頁面都可以貼上新圖片
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const f = imageFromPaste(e)
      if (f) {
        e.preventDefault()
        void onFile(f)
      }
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [onFile])

  const run = async (cmd: ToolCommand) => {
    const out = editor.state().output
    switch (cmd) {
      case 'crop':
        if (mode === 'cropping') setMode('viewing')
        else if (ed.edit) {
          setCropBox(initialBox(out, ratioValue(ratioOpt, out)))
          setMode('cropping')
        }
        return
      case 'apply-crop':
        editor.push({ type: 'crop', ...cropBox })
        setMode('viewing')
        return
      case 'cancel-crop':
        setMode('viewing')
        return
      case 'rotate-cw':
      case 'rotate-ccw':
        setMode('viewing')
        return editor.push({ type: 'rotate', direction: cmd === 'rotate-cw' ? 1 : -1 })
      case 'flip-x':
      case 'flip-y':
        setMode('viewing')
        return editor.push({ type: 'flip', axis: cmd === 'flip-x' ? 'x' : 'y' })
      case 'resize':
        setResizeOpen(true)
        return
      case 'reset':
        setMode('viewing')
        return editor.push({ type: 'reset' })
      case 'undo':
        return editor.undo()
      case 'redo':
        return editor.redo()
      case 'copy':
        if (file) setToast(await copyResult(compressor, ctl.result()))
        return
      case 'download': {
        const l = ctl.lastDone()
        if (l) setToast(downloadResult(l.result, l.source.name))
        return
      }
      case 'help':
        setHelpOpen(true)
        return
    }
  }
  const runRef = useRef(run)
  useEffect(() => {
    runRef.current = run
  })

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (resizeOpen || helpOpen) return
      const m = commandFor({
        key: e.key,
        metaKey: e.metaKey,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        textTarget: isTextTarget(e.target),
        hasSelection: !!window.getSelection()?.toString(),
        mode,
      })
      if (!m) return
      if (!file && m.command !== 'help') return
      if (m.preventDefault) e.preventDefault()
      void runRef.current(m.command)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [file, helpOpen, mode, resizeOpen])

  const onRatio = (opt: RatioOption) => {
    setRatioOpt(opt)
    const out = editor.state().output
    setCropBox(initialBox(out, ratioValue(opt, out)))
  }

  return (
    <main className={`app${file ? ' has-file' : ''}`}>
      <header className="app-header">
        <h1>{t.title}</h1>
        <p>{t.tagline}</p>
      </header>

      {!file ? (
        <>
          <DropZone onFile={onFile} />
          <SettingsPanel value={settings} onChange={onSettings} />
        </>
      ) : (
        <div className="workspace">
          <section className="stage-col" aria-label="編輯畫布" data-testid="canvas">
            <Toolbar
              canUndo={ed.canUndo}
              canRedo={ed.canRedo}
              cropping={mode === 'cropping'}
              onCommand={(c) => void run(c)}
            />
            {mode === 'cropping' && (
              <div className="crop-bar">
                <label>
                  裁切比例{' '}
                  <select
                    value={ratioOpt}
                    onChange={(e) => onRatio(e.currentTarget.value as RatioOption)}
                  >
                    {RATIOS.map((r) => (
                      <option key={r} value={r}>
                        {RATIO_LABEL[r]}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => void run('apply-crop')}
                >
                  套用裁切
                </button>
                <button type="button" className="btn" onClick={() => void run('cancel-crop')}>
                  取消
                </button>
              </div>
            )}
            <div
              className={`stage${mode === 'viewing' && view.kind === 'done' ? ' has-slider' : ''}`}
            >
              {preview && ed.edit && ed.source && (
                <>
                  <EditorCanvas preview={preview} source={ed.source} edit={ed.edit} />
                  {mode === 'cropping' ? (
                    <CropOverlay
                      output={ed.edit.output}
                      box={cropBox}
                      ratio={ratioValue(ratioOpt, ed.edit.output)}
                      onChange={setCropBox}
                      onApply={() => void run('apply-crop')}
                      onCancel={() => void run('cancel-crop')}
                    />
                  ) : (
                    view.kind === 'done' &&
                    last && <CompareSlider after={last.url} value={compare} onChange={setCompare} />
                  )}
                </>
              )}
            </div>
            {ed.edit && (
              <p className="output-size" data-testid="output-size">
                {ed.edit.output.width} × {ed.edit.output.height}
              </p>
            )}
          </section>

          <aside className="side">
            <DropZone onFile={onFile} compact />
            <SettingsPanel value={settings} onChange={onSettings} />
            {view.kind === 'error' ? (
              <p className="error-box" role="alert" data-testid="error">
                {view.error.message}
              </p>
            ) : (
              <>
                <ResultInfo
                  source={last?.source ?? null}
                  result={last?.result ?? null}
                  busy={view.kind === 'processing'}
                />
                {last && (
                  <Actions
                    result={last.result}
                    name={last.source.name}
                    compressor={compressor}
                    onNotify={setToast}
                  />
                )}
              </>
            )}
            <Toast message={toast} />
            <button type="button" className="btn-link" onClick={() => setHelpOpen(true)}>
              快捷鍵（?）
            </button>
          </aside>
        </div>
      )}

      <footer className="app-footer">{t.privacy}</footer>

      {ed.edit && (
        <ResizeDialog
          open={resizeOpen}
          current={ed.edit.output}
          oriented={orientedSize(ed.edit)}
          onApply={(s) => {
            setResizeOpen(false)
            editor.push({ type: 'resize', ...s })
          }}
          onClose={() => setResizeOpen(false)}
        />
      )}
      <ShortcutHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
    </main>
  )
}
