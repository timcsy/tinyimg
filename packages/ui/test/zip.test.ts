import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { crc32, createZip } from '../src/lib/zip'

const enc = (s: string) => new TextEncoder().encode(s)

describe('crc32', () => {
  it('已知向量', () => {
    expect(crc32(enc(''))).toBe(0)
    expect(crc32(enc('123456789'))).toBe(0xcbf43926)
    expect(crc32(enc('The quick brown fox jumps over the lazy dog'))).toBe(0x414fa339)
  })
})

describe('createZip（store 模式）', () => {
  // 以 Python zipfile 解開：macOS 內建的 unzip（Info-ZIP 6.00）不支援 UTF-8 檔名旗標，中文檔名會變成亂碼
  function unzip(bytes: Uint8Array) {
    const dir = mkdtempSync(join(tmpdir(), 'zip-'))
    const file = join(dir, 'a.zip')
    writeFileSync(file, bytes)
    execFileSync('python3', [
      '-I',
      '-c',
      'import sys,zipfile; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])',
      file,
      join(dir, 'out'),
    ])
    return (name: string) => readFileSync(join(dir, 'out', name))
  }
  it('可以被標準的 zip 實作解開，內容完全相同（含中文檔名）', () => {
    const a = new Uint8Array([0, 1, 2, 255, 254])
    const b = enc('hello')
    const zip = createZip([
      { name: 'a.bin', data: a },
      { name: '照片_compressed.jpg', data: b },
    ])
    const read = unzip(zip)
    expect(new Uint8Array(read('a.bin'))).toEqual(a)
    expect(new Uint8Array(read('照片_compressed.jpg'))).toEqual(b)
    // 檔名以 UTF-8 儲存，並設定了 general purpose bit 11
    const idx = zip.findIndex(
      (_, i) => zip[i] === 0x50 && zip[i + 1] === 0x4b && zip[i + 2] === 0x03 && i > 0,
    )
    const flags = new DataView(zip.buffer, idx).getUint16(6, true)
    expect(flags & 0x0800).toBe(0x0800)
  })
  it('通過 unzip -t 的完整性檢查（CRC 正確）', () => {
    const dir = mkdtempSync(join(tmpdir(), 'zip-'))
    const file = join(dir, 't.zip')
    writeFileSync(file, createZip([{ name: 'x.txt', data: enc('x'.repeat(1000)) }]))
    expect(execFileSync('unzip', ['-t', file], { encoding: 'utf8' })).toMatch(/No errors detected/)
  })
  it('空清單也是合法的 zip（只有 end of central directory）', () => {
    const zip = createZip([])
    expect(zip.length).toBe(22)
    expect(Array.from(zip.slice(0, 4))).toEqual([0x50, 0x4b, 0x05, 0x06])
  })
})
