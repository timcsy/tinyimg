import { describe, expect, it } from 'vitest'
import { cacheName, precacheList, routeFor, SHARE_INBOX, staleCaches } from '../src/sw-core'

const scope = 'https://timcsy.github.io/tinyimg/'
const req = (url: string, method = 'GET', mode: RequestMode = 'no-cors') => ({ url, method, mode })

describe('routeFor', () => {
  it.each([
    [req(scope, 'GET', 'navigate'), 'navigate'],
    [req(`${scope}?share=1`, 'GET', 'navigate'), 'navigate'],
    [req(`${scope}assets/index-abc.js`), 'precache'],
    [req(`${scope}assets/mozjpeg_enc-xyz.wasm`), 'precache'],
    [req(`${scope}share`, 'POST'), 'share'],
    [req(`${scope}assets/x.js`, 'POST'), 'network'],
    [req('https://other.example/x.js'), 'network'],
    [req('https://timcsy.github.io/other-site/x.js'), 'network'],
  ] as const)('%o → %s', (r, route) => expect(routeFor(r, scope)).toBe(route))
})

describe('precacheList', () => {
  it('包含網站檔案；排除 Vite manifest、sourcemap 與 sw.js 本身；加上根目錄', () => {
    expect(
      precacheList([
        'index.html',
        'assets/index-a.js',
        'assets/index-a.js.map',
        'assets/worker-b.js',
        'assets/x.wasm',
        '.vite/manifest.json',
        'sw.js',
        'manifest.webmanifest',
        'icon-192.png',
      ]),
    ).toEqual([
      './',
      'index.html',
      'assets/index-a.js',
      'assets/worker-b.js',
      'assets/x.wasm',
      'manifest.webmanifest',
      'icon-192.png',
    ])
  })
})

describe('快取版本', () => {
  it('cacheName 帶版本', () => expect(cacheName('abc123')).toBe('tinyimg-abc123'))
  it('staleCaches 回傳本網站的舊版本，保留目前版本與分享收件匣，不碰其他網站的快取', () => {
    expect(
      staleCaches(['tinyimg-old', 'tinyimg-new', SHARE_INBOX, 'someone-else'], 'tinyimg-new'),
    ).toEqual(['tinyimg-old'])
  })
})
