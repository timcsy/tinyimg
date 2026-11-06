import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { fixture } from './helpers'

test('批次：3 張中 1 張損毀 → 2 張成功；zip 只含成功的 2 張；可開啟單張再回到批次（SC-003）', async ({
  page,
}) => {
  await page.goto('./')
  await page
    .getByTestId('file-input')
    .setInputFiles([fixture('photo.jpg'), fixture('corrupt.png'), fixture('small.png')])
  const progress = page.getByTestId('batch-progress')
  await expect(progress).toHaveText('全部完成：3 / 3', { timeout: 60_000 })
  await expect(page.getByRole('listitem').nth(1)).toContainText('無法讀取')

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '全部下載（2 張，zip）' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('tinyimg-batch.zip')
  const dir = mkdtempSync(join(tmpdir(), 'batch-'))
  const file = join(dir, 'b.zip')
  writeFileSync(file, Buffer.concat(await (await download.createReadStream()).toArray()))
  const names = execFileSync(
    'python3',
    [
      '-I',
      '-c',
      'import sys,zipfile; print("\\n".join(zipfile.ZipFile(sys.argv[1]).namelist()))',
      file,
    ],
    { encoding: 'utf8' },
  )
    .trim()
    .split('\n')
  expect(names.sort()).toEqual(['photo_compressed.jpg', 'small_compressed.png'])
  expect(execFileSync('unzip', ['-t', file], { encoding: 'utf8' })).toMatch(/No errors detected/)

  await page.getByRole('button', { name: '在編輯器開啟 photo.jpg' }).click()
  await expect(page.getByTestId('output-size')).toHaveText('2400 × 1600', { timeout: 30_000 })
  await page.getByRole('button', { name: '回到批次（3 張）' }).click()
  await expect(progress).toHaveText('全部完成：3 / 3')
})
