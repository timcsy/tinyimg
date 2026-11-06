#!/usr/bin/env node
// 打包外掛：以 tag 的版本號建置 → 掃描遠端程式碼（SC-005）→ 產生 tinyimg-extension-<版本>.zip（SC-006）
// 用法：node scripts/package.mjs v0.2.0 [--skip-build] [--dist <dir>]
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const tag = args[0]
const fail = (msg) => {
  console.error(msg)
  process.exit(1)
}
if (!tag) fail('用法：node scripts/package.mjs vX.Y.Z [--skip-build] [--dist <dir>]')
const version = tag.replace(/^v/, '')
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const distArg = args.indexOf('--dist')
const dist = distArg >= 0 ? resolve(args[distArg + 1]) : join(root, 'dist')

if (!args.includes('--skip-build')) {
  execFileSync('npm', ['run', 'build'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, TINYIMG_VERSION: tag },
  })
}

const manifest = JSON.parse(readFileSync(join(dist, 'manifest.json'), 'utf8'))
if (manifest.version !== version) fail(`manifest 版本 ${manifest.version} 與 tag ${tag} 不一致`)

// 遠端程式碼：遠端的 import、importScripts，以及 <script src="http(s)://...">
const REMOTE = [
  /\bimport\s*\(\s*['"`]https?:\/\//,
  /\bimport\s+[^'"`;]*?\bfrom\s*['"`]https?:\/\//,
  /\bimport\s*['"`]https?:\/\//,
  /\bimportScripts\s*\(\s*['"`]https?:\/\//,
  /<script[^>]+src\s*=\s*['"]https?:\/\//i,
]
const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
const offenders = walk(dist)
  .filter((f) => /\.(js|mjs|html)$/.test(f))
  .filter((f) => REMOTE.some((re) => re.test(readFileSync(f, 'utf8'))))
if (offenders.length) fail(`偵測到遠端程式碼載入：\n${offenders.join('\n')}`)

const zip = join(dist, '..', `tinyimg-extension-${version}.zip`)
rmSync(zip, { force: true })
execFileSync('zip', ['-r', '-q', zip, '.'], { cwd: dist })
console.log(`已產生 ${zip}`)
