import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, type Page } from '@playwright/test'
import { FIXTURES } from './fixtures/global-setup'

export const fixture = (name: string) => join(FIXTURES, name)

export async function choose(page: Page, name: string) {
  await page.getByTestId('file-input').setInputFiles(fixture(name))
}

const MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  txt: 'text/plain',
}
const mimeOf = (name: string) => MIME[name.split('.').pop()!] ?? 'application/octet-stream'

/** 以 DataTransfer 模擬拖曳 */
export async function drop(page: Page, name: string) {
  const b64 = readFileSync(fixture(name)).toString('base64')
  const dt = await page.evaluateHandle(
    async ({ b64, name, type }) => {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
      const dt = new DataTransfer()
      dt.items.add(new File([bytes], name, { type }))
      return dt
    },
    { b64, name, type: mimeOf(name) },
  )
  const zone = page.getByTestId('dropzone')
  await zone.dispatchEvent('dragover', { dataTransfer: dt })
  await zone.dispatchEvent('drop', { dataTransfer: dt })
}

/** 以 ClipboardEvent 模擬貼上 */
export async function paste(page: Page, name: string) {
  const b64 = readFileSync(fixture(name)).toString('base64')
  await page.evaluate(
    ({ b64, name, type }) => {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
      const dt = new DataTransfer()
      dt.items.add(new File([bytes], name, { type }))
      // Firefox 會忽略建構參數中的 clipboardData，所以直接掛到事件上（真實貼上時瀏覽器會自己提供）
      const ev = new ClipboardEvent('paste', { bubbles: true, cancelable: true })
      Object.defineProperty(ev, 'clipboardData', { value: dt })
      document.dispatchEvent(ev)
    },
    { b64, name, type: mimeOf(name) },
  )
}

export async function waitForResult(page: Page) {
  await expect(page.getByTestId('result-status')).toBeVisible({ timeout: 30_000 })
}
