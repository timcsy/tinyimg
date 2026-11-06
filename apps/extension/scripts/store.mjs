// 把外掛 zip 上傳到 Chrome Web Store（API v2）與 Edge Add-ons（API v1.1）。
// 只用 Node 內建的 fetch；任何輸出都不含憑證的值（spec 006 FR-004）。
// 用法：node scripts/store.mjs <zip 路徑>；預設只上傳成草稿，STORE_PUBLISH=1 才送審。
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const CHROME_VARS = [
  'CWS_CLIENT_ID',
  'CWS_CLIENT_SECRET',
  'CWS_REFRESH_TOKEN',
  'CWS_PUBLISHER_ID',
  'CWS_EXTENSION_ID',
]
const EDGE_VARS = ['EDGE_CLIENT_ID', 'EDGE_API_KEY', 'EDGE_PRODUCT_ID']
const EDGE_API = 'https://api.addons.microsoftedge.microsoft.com'
const CWS_API = 'https://chromewebstore.googleapis.com'
const POLL_LIMIT = 20
const POLL_MS = 5000

/** 某家商店：全部沒設 → null；全部設好 → 值；部分設定 → 列入 missing */
function pick(env, vars, missing) {
  const set = vars.filter((v) => env[v])
  if (set.length === 0) return null
  if (set.length < vars.length) {
    missing.push(...vars.filter((v) => !env[v]))
    return null
  }
  return Object.fromEntries(vars.map((v) => [v, env[v]]))
}

export function storeConfig(env) {
  const missing = []
  const chrome = pick(env, CHROME_VARS, missing)
  const edge = pick(env, EDGE_VARS, missing)
  return { chrome, edge, missing }
}

/** 只取回應裡的狀態碼與商店訊息，不帶請求內容（請求標頭含憑證） */
async function check(res, what) {
  if (res.ok) return res
  let detail = ''
  try {
    const body = await res.json()
    detail = body?.error?.message ?? body?.message ?? ''
  } catch {
    /* 沒有 JSON 本文 */
  }
  throw new Error(`${what} 失敗：HTTP ${res.status}${detail ? `（${detail}）` : ''}`)
}

async function chromeUpload(c, zip, publish, fetch, log) {
  const tokenRes = await check(
    await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: c.CWS_CLIENT_ID,
        client_secret: c.CWS_CLIENT_SECRET,
        refresh_token: c.CWS_REFRESH_TOKEN,
        grant_type: 'refresh_token',
      }).toString(),
    }),
    'Chrome：取得 access token',
  )
  const { access_token: token } = await tokenRes.json()
  const auth = { Authorization: `Bearer ${token}` }
  const item = `publishers/${c.CWS_PUBLISHER_ID}/items/${c.CWS_EXTENSION_ID}`

  const up = await check(
    await fetch(`${CWS_API}/upload/v2/${item}:upload`, {
      method: 'POST',
      headers: auth,
      body: zip,
    }),
    'Chrome：上傳',
  )
  const { uploadState } = await up.json()
  if (uploadState === 'FAILED') throw new Error(`Chrome：上傳狀態 ${uploadState}`)
  log(`Chrome Web Store：已上傳（${uploadState ?? '狀態未知'}）`)

  if (!publish) return
  const pub = await check(
    await fetch(`${CWS_API}/v2/${item}:publish`, { method: 'POST', headers: auth }),
    'Chrome：送審',
  )
  const { state } = await pub.json()
  log(`Chrome Web Store：已送審（${state ?? '狀態未知'}）`)
}

async function edgeUpload(e, zip, publish, fetch, sleep, log) {
  const auth = { Authorization: `ApiKey ${e.EDGE_API_KEY}`, 'X-ClientID': e.EDGE_CLIENT_ID }
  const base = `${EDGE_API}/v1/products/${e.EDGE_PRODUCT_ID}/submissions`

  const up = await check(
    await fetch(`${base}/draft/package`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/zip' },
      body: zip,
    }),
    'Edge：上傳',
  )
  const op = up.headers.get('Location')
  if (!op) throw new Error('Edge：上傳的回應沒有 Location，無法確認狀態')

  for (let i = 0; ; i++) {
    const res = await check(
      await fetch(`${base}/draft/package/operations/${op}`, { method: 'GET', headers: auth }),
      'Edge：查詢上傳狀態',
    )
    const { status, message } = await res.json()
    if (status === 'Succeeded') break
    if (status !== 'InProgress')
      throw new Error(`Edge：上傳狀態 ${status}${message ? `（${message}）` : ''}`)
    if (i + 1 >= POLL_LIMIT) throw new Error(`Edge：上傳狀態一直是 InProgress，等待逾時`)
    await sleep(POLL_MS)
  }
  log('Edge Add-ons：已上傳成草稿')

  if (!publish) return
  await check(
    await fetch(base, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: '由 GitHub Actions 依 tag 自動送審。' }),
    }),
    'Edge：送審',
  )
  log('Edge Add-ons：已送審')
}

export async function uploadToStores({ zip, env, fetch, sleep, log }) {
  const { chrome, edge, missing } = storeConfig(env)
  if (missing.length) {
    throw new Error(`商店憑證不完整，缺少：${missing.join(', ')}`)
  }
  const publish = env.STORE_PUBLISH === '1'
  if (!chrome && !edge) {
    log('沒有設定商店憑證，略過上架。')
    return
  }
  if (chrome) await chromeUpload(chrome, zip, publish, fetch, log)
  else log('Chrome Web Store：沒有設定憑證，略過。')
  if (edge) await edgeUpload(edge, zip, publish, fetch, sleep, log)
  else log('Edge Add-ons：沒有設定憑證，略過。')
  if (!publish) log('只上傳成草稿；要送審請設定 STORE_PUBLISH=1。')
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const path = process.argv[2]
  if (!path) {
    console.error('用法：node scripts/store.mjs <zip 路徑>')
    process.exit(2)
  }
  try {
    await uploadToStores({
      zip: readFileSync(path),
      env: process.env,
      fetch: globalThis.fetch,
      sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
      log: (s) => console.log(s),
    })
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e))
    process.exit(1)
  }
}
