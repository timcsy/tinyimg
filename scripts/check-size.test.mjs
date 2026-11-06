import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'

const script = new URL('./check-size.mjs', import.meta.url).pathname

function fakeDist(files, manifest) {
  const dir = mkdtempSync(join(tmpdir(), 'size-'))
  mkdirSync(join(dir, '.vite'))
  mkdirSync(join(dir, 'assets'))
  for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content)
  writeFileSync(join(dir, '.vite/manifest.json'), JSON.stringify(manifest))
  return dir
}
const run = (dir, budget) =>
  spawnSync(process.execPath, [script, dir, ...(budget ? [String(budget)] : [])], {
    encoding: 'utf8',
  })

test('未超過預算時通過，並印出大小', () => {
  const dir = fakeDist(
    { 'assets/entry.js': 'console.log(1)'.repeat(10) },
    { 'index.html': { file: 'assets/entry.js', isEntry: true } },
  )
  const r = run(dir)
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /KB/)
})

test('超過預算時失敗', () => {
  const dir = fakeDist(
    { 'assets/entry.js': randomBytes(300 * 1024).toString('base64') },
    { 'index.html': { file: 'assets/entry.js', isEntry: true } },
  )
  assert.equal(run(dir).status, 1)
})

test('只計入入口與靜態 import，不計動態 import 與 wasm', () => {
  const big = randomBytes(300 * 1024).toString('base64')
  const dir = fakeDist(
    {
      'assets/entry.js': 'a',
      'assets/shared.js': 'b',
      'assets/lazy.js': big,
      'assets/codec.wasm': big,
    },
    {
      'index.html': {
        file: 'assets/entry.js',
        isEntry: true,
        imports: ['_shared'],
        dynamicImports: ['lazy'],
      },
      _shared: { file: 'assets/shared.js' },
      lazy: { file: 'assets/lazy.js', isDynamicEntry: true },
      codec: { file: 'assets/codec.wasm' },
    },
  )
  assert.equal(run(dir).status, 0)
})

test('靜態 import 超過預算也會失敗', () => {
  const dir = fakeDist(
    { 'assets/entry.js': 'a', 'assets/shared.js': randomBytes(300 * 1024).toString('base64') },
    {
      'index.html': { file: 'assets/entry.js', isEntry: true, imports: ['_shared'] },
      _shared: { file: 'assets/shared.js' },
    },
  )
  assert.equal(run(dir).status, 1)
})

test('找不到 manifest 時失敗', () => {
  const dir = mkdtempSync(join(tmpdir(), 'size-'))
  assert.equal(run(dir).status, 1)
})
