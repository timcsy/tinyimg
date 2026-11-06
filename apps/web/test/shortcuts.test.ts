import { describe, expect, it } from 'vitest'
import { commandFor, isTextTarget, SHORTCUTS, type KeyInput } from '../src/lib/shortcuts'

const key = (k: string, over: Partial<KeyInput> = {}): KeyInput => ({
  key: k,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  textTarget: false,
  hasSelection: false,
  mode: 'viewing',
  ...over,
})

describe('commandFor：單鍵快捷鍵', () => {
  it.each([
    ['c', {}, 'crop'],
    ['r', {}, 'rotate-cw'],
    ['R', { shiftKey: true }, 'rotate-ccw'],
    ['f', {}, 'flip-x'],
    ['F', { shiftKey: true }, 'flip-y'],
    ['?', { shiftKey: true }, 'help'],
  ] as const)('%s → %s', (k, over, cmd) => {
    expect(commandFor(key(k, over))?.command).toBe(cmd)
  })
  it('大小寫鎖定也能用（key 為大寫但沒按 Shift）', () => {
    expect(commandFor(key('C'))?.command).toBe('crop')
  })
  it('焦點在文字欄位時不攔截單鍵', () => {
    expect(commandFor(key('r', { textTarget: true }))).toBeNull()
  })
  it('搭配 ⌘ 或 Ctrl 的單鍵不當作工具快捷鍵（例如 ⌘R 是重新整理）', () => {
    expect(commandFor(key('r', { metaKey: true }))).toBeNull()
  })
})

describe('commandFor：組合鍵', () => {
  it.each([
    ['z', { metaKey: true }, 'undo'],
    ['z', { ctrlKey: true }, 'undo'],
    ['z', { metaKey: true, shiftKey: true }, 'redo'],
    ['Z', { ctrlKey: true, shiftKey: true }, 'redo'],
    ['y', { ctrlKey: true }, 'redo'],
    ['c', { metaKey: true }, 'copy'],
    ['s', { ctrlKey: true }, 'download'],
  ] as const)('%s %o → %s', (k, over, cmd) => {
    const r = commandFor(key(k, over))
    expect(r?.command).toBe(cmd)
    expect(r?.preventDefault).toBe(true)
  })
  it('焦點在文字欄位時，⌘Z 與 ⌘C 交給瀏覽器', () => {
    expect(commandFor(key('z', { metaKey: true, textTarget: true }))).toBeNull()
    expect(commandFor(key('c', { metaKey: true, textTarget: true }))).toBeNull()
  })
  it('頁面上有選取文字時，⌘C 交給瀏覽器', () => {
    expect(commandFor(key('c', { metaKey: true, hasSelection: true }))).toBeNull()
  })
  it('⌘S 即使在文字欄位也攔截（避免另存網頁）', () => {
    expect(commandFor(key('s', { metaKey: true, textTarget: true }))?.command).toBe('download')
  })
})

describe('commandFor：裁切模式', () => {
  it('Enter 套用、Escape 取消', () => {
    expect(commandFor(key('Enter', { mode: 'cropping' }))?.command).toBe('apply-crop')
    expect(commandFor(key('Escape', { mode: 'cropping' }))?.command).toBe('cancel-crop')
  })
  it('裁切模式中 ⌘Z 先取消裁切', () => {
    expect(commandFor(key('z', { metaKey: true, mode: 'cropping' }))?.command).toBe('cancel-crop')
  })
  it('一般模式的 Enter 不做事', () => {
    expect(commandFor(key('Enter'))).toBeNull()
  })
})

describe('isTextTarget', () => {
  it.each([
    [{ tagName: 'INPUT' }, true],
    [{ tagName: 'TEXTAREA' }, true],
    [{ tagName: 'SELECT' }, true],
    [{ tagName: 'DIV', isContentEditable: true }, true],
    [{ tagName: 'BUTTON' }, false],
    [null, false],
  ])('%o → %s', (t, v) => expect(isTextTarget(t)).toBe(v))
})

describe('SHORTCUTS（說明對話框的資料）', () => {
  it('每個命令都有說明與按鍵', () => {
    expect(SHORTCUTS.length).toBeGreaterThanOrEqual(10)
    for (const s of SHORTCUTS) expect(s.keys.length && s.label.length).toBeTruthy()
  })
})
