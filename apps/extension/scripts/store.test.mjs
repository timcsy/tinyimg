import { test } from 'node:test'
import assert from 'node:assert/strict'
import { storeConfig, uploadToStores } from './store.mjs'

const CHROME = {
  CWS_CLIENT_ID: 'cid-secret-1',
  CWS_CLIENT_SECRET: 'csecret-secret-2',
  CWS_REFRESH_TOKEN: 'refresh-secret-3',
  CWS_PUBLISHER_ID: 'pub1',
  CWS_EXTENSION_ID: 'ext1',
}
const EDGE = {
  EDGE_CLIENT_ID: 'eclient-secret-4',
  EDGE_API_KEY: 'ekey-secret-5',
  EDGE_PRODUCT_ID: 'prod1',
}
const SECRETS = [
  'cid-secret-1',
  'csecret-secret-2',
  'refresh-secret-3',
  'eclient-secret-4',
  'ekey-secret-5',
  'tok-secret-6',
]
const zip = new Uint8Array([0x50, 0x4b, 3, 4])

/** 假的 fetch：依序比對 handlers，記錄每個請求 */
function fakeFetch(handlers) {
  const calls = []
  const fn = async (url, init = {}) => {
    calls.push({
      url: String(url),
      method: init.method ?? 'GET',
      headers: init.headers ?? {},
      body: init.body,
    })
    const h = handlers.find((x) => x.match(String(url), init))
    if (!h) throw new Error(`unexpected request ${init.method} ${url}`)
    const { status = 200, json = {}, headers = {} } = typeof h.res === 'function' ? h.res() : h.res
    return new Response(JSON.stringify(json), { status, headers })
  }
  fn.calls = calls
  return fn
}
const chromeHandlers = (uploadState = 'SUCCEEDED') => [
  {
    match: (u) => u === 'https://oauth2.googleapis.com/token',
    res: { json: { access_token: 'tok-secret-6', expires_in: 3600 } },
  },
  {
    match: (u) => u.endsWith('/upload/v2/publishers/pub1/items/ext1:upload'),
    res: { json: { uploadState } },
  },
  {
    match: (u) => u.endsWith('/v2/publishers/pub1/items/ext1:publish'),
    res: { json: { state: 'PENDING_REVIEW' } },
  },
]
const edgeHandlers = (statuses = ['InProgress', 'Succeeded']) => {
  let i = 0
  return [
    {
      match: (u) => u.endsWith('/v1/products/prod1/submissions/draft/package'),
      res: { status: 202, headers: { Location: 'op-up-1' } },
    },
    {
      match: (u) => u.endsWith('/submissions/draft/package/operations/op-up-1'),
      res: () => ({ json: { status: statuses[Math.min(i++, statuses.length - 1)], message: 'm' } }),
    },
    {
      match: (u, init) => u.endsWith('/v1/products/prod1/submissions') && init.method === 'POST',
      res: { status: 202, headers: { Location: 'op-pub-1' } },
    },
  ]
}
function collect() {
  const lines = []
  const log = (s) => lines.push(String(s))
  log.lines = lines
  return log
}
const run = (env, fetch, log = collect()) =>
  uploadToStores({ zip, env, fetch, sleep: async () => {}, log }).then(
    (r) => ({ ok: true, r, log }),
    (e) => ({ ok: false, e, log }),
  )
function assertNoSecrets(text) {
  for (const s of SECRETS) assert.ok(!text.includes(s), `輸出包含憑證：${s}`)
}

test('情境 1：沒有任何憑證 → 略過、不發請求、成功', async () => {
  const fetch = fakeFetch([])
  const { ok, log } = await run({}, fetch)
  assert.ok(ok)
  assert.equal(fetch.calls.length, 0)
  assert.match(log.lines.join('\n'), /略過/)
})

test('情境 2：只設定部分憑證 → 失敗，只列出缺少的變數名稱', async () => {
  const cfg = storeConfig({ CWS_CLIENT_ID: 'cid-secret-1', EDGE_API_KEY: 'ekey-secret-5' })
  assert.deepEqual(cfg.missing.sort(), [
    'CWS_CLIENT_SECRET',
    'CWS_EXTENSION_ID',
    'CWS_PUBLISHER_ID',
    'CWS_REFRESH_TOKEN',
    'EDGE_CLIENT_ID',
    'EDGE_PRODUCT_ID',
  ])
  const fetch = fakeFetch([])
  const { ok, e, log } = await run(
    { CWS_CLIENT_ID: 'cid-secret-1', EDGE_API_KEY: 'ekey-secret-5' },
    fetch,
  )
  assert.ok(!ok)
  assert.equal(fetch.calls.length, 0)
  assert.match(e.message, /CWS_REFRESH_TOKEN/)
  assertNoSecrets(e.message + log.lines.join('\n'))
})

test('情境 3：憑證齊全、未設定 STORE_PUBLISH → 兩家都只上傳，不送審', async () => {
  const fetch = fakeFetch([...chromeHandlers(), ...edgeHandlers()])
  const { ok, e, log } = await run({ ...CHROME, ...EDGE }, fetch)
  assert.ok(ok, e?.message)
  const urls = fetch.calls.map((c) => `${c.method} ${c.url}`)
  assert.ok(!urls.some((u) => u.includes(':publish')), urls.join('\n'))
  assert.ok(
    !urls.some((u) => /POST .*\/v1\/products\/prod1\/submissions$/.test(u)),
    urls.join('\n'),
  )

  const token = fetch.calls[0]
  assert.equal(token.method, 'POST')
  const form = new URLSearchParams(token.body)
  assert.equal(form.get('grant_type'), 'refresh_token')
  assert.equal(form.get('refresh_token'), 'refresh-secret-3')

  const up = fetch.calls.find((c) => c.url.includes(':upload'))
  assert.equal(
    up.url,
    'https://chromewebstore.googleapis.com/upload/v2/publishers/pub1/items/ext1:upload',
  )
  assert.equal(up.method, 'POST')
  assert.equal(up.headers.Authorization, 'Bearer tok-secret-6')
  assert.equal(up.body, zip)

  const eu = fetch.calls.find((c) => c.url.endsWith('/draft/package'))
  assert.equal(
    eu.url,
    'https://api.addons.microsoftedge.microsoft.com/v1/products/prod1/submissions/draft/package',
  )
  assert.equal(eu.method, 'POST')
  assert.equal(eu.headers.Authorization, 'ApiKey ekey-secret-5')
  assert.equal(eu.headers['X-ClientID'], 'eclient-secret-4')
  assert.equal(eu.headers['Content-Type'], 'application/zip')
  // 輪詢上傳狀態直到不是 InProgress
  assert.equal(fetch.calls.filter((c) => c.url.includes('/operations/op-up-1')).length, 2)
  assertNoSecrets(log.lines.join('\n'))
})

test('情境 4：STORE_PUBLISH=1 → 上傳後送審', async () => {
  const fetch = fakeFetch([...chromeHandlers(), ...edgeHandlers(['Succeeded'])])
  const { ok, e } = await run({ ...CHROME, ...EDGE, STORE_PUBLISH: '1' }, fetch)
  assert.ok(ok, e?.message)
  const pub = fetch.calls.find((c) => c.url.endsWith(':publish'))
  assert.equal(pub.method, 'POST')
  assert.equal(pub.headers.Authorization, 'Bearer tok-secret-6')
  const epub = fetch.calls.find((c) => c.url.endsWith('/v1/products/prod1/submissions'))
  assert.equal(epub.method, 'POST')
  assert.equal(epub.headers.Authorization, 'ApiKey ekey-secret-5')
  assert.ok(JSON.parse(epub.body).notes)
})

test('只設定 Chrome 也可以，Edge 略過', async () => {
  const fetch = fakeFetch(chromeHandlers())
  const { ok, e, log } = await run(CHROME, fetch)
  assert.ok(ok, e?.message)
  assert.match(log.lines.join('\n'), /Edge.*略過/)
})

test('情境 5：Chrome 上傳失敗 → 失敗並顯示狀態，不含憑證', async () => {
  const fetch = fakeFetch(chromeHandlers('FAILED'))
  const { ok, e, log } = await run(CHROME, fetch)
  assert.ok(!ok)
  assert.match(e.message, /Chrome.*FAILED/)
  assertNoSecrets(e.message + log.lines.join('\n'))
})

test('情境 5：HTTP 錯誤 → 失敗並顯示狀態碼', async () => {
  const fetch = fakeFetch([
    {
      match: (u) => u.endsWith('/draft/package'),
      res: { status: 401, json: { message: 'bad key' } },
    },
  ])
  const { ok, e, log } = await run(EDGE, fetch)
  assert.ok(!ok)
  assert.match(e.message, /401/)
  assertNoSecrets(e.message + log.lines.join('\n'))
})

test('情境 5：Edge 上傳狀態 Failed → 失敗', async () => {
  const fetch = fakeFetch(edgeHandlers(['InProgress', 'Failed']))
  const { ok, e } = await run(EDGE, fetch)
  assert.ok(!ok)
  assert.match(e.message, /Edge.*Failed/)
})

test('Edge 一直 InProgress → 超過次數後失敗，不會無限等待', async () => {
  const fetch = fakeFetch(edgeHandlers(['InProgress']))
  const { ok, e } = await run(EDGE, fetch)
  assert.ok(!ok)
  assert.match(e.message, /逾時|InProgress/)
})
