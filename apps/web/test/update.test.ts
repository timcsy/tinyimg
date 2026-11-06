import { describe, expect, it, vi } from 'vitest'
import { watchForUpdate } from '../src/update'

/** 假的 ServiceWorker 與 container：可以手動推進狀態，模擬事件處理被延後 */
class FakeSW extends EventTarget {
  state = 'installing'
  postMessage = vi.fn()
  set(s: string) {
    this.state = s
    this.dispatchEvent(new Event('statechange'))
  }
}
class FakeReg extends EventTarget {
  installing: FakeSW | null = null
  waiting: FakeSW | null = null
}
function setup(controller: object | null) {
  const reg = new FakeReg()
  const container = {
    controller,
    register: vi.fn(async () => reg),
  }
  return { reg, container }
}
const flush = () => new Promise((r) => setTimeout(r, 0))

describe('watchForUpdate', () => {
  it('第一次安裝：即使接管（claim）比「已安裝」事件先被處理，也不提示更新', async () => {
    const { reg, container } = setup(null)
    const onWaiting = vi.fn()
    watchForUpdate(container as never, './sw.js', onWaiting)
    await flush()
    const sw = new FakeSW()
    reg.installing = sw
    reg.dispatchEvent(new Event('updatefound'))
    container.controller = sw // 新的 SW 已經接管頁面
    sw.set('installed') // 頁面這時才處理到「已安裝」
    expect(onWaiting).not.toHaveBeenCalled()
  })

  it('已有舊版本在控制頁面時，新版本安裝完成就提示', async () => {
    const { reg, container } = setup({ old: true })
    const onWaiting = vi.fn()
    watchForUpdate(container as never, './sw.js', onWaiting)
    await flush()
    const sw = new FakeSW()
    reg.installing = sw
    reg.dispatchEvent(new Event('updatefound'))
    sw.set('installed')
    expect(onWaiting).toHaveBeenCalledWith(sw)
  })

  it('註冊時已經有等待中的新版本（例如上次沒更新）→ 提示', async () => {
    const { reg, container } = setup({ old: true })
    const waiting = new FakeSW()
    waiting.state = 'installed'
    reg.waiting = waiting
    const onWaiting = vi.fn()
    watchForUpdate(container as never, './sw.js', onWaiting)
    await flush()
    expect(onWaiting).toHaveBeenCalledWith(waiting)
  })

  it('取消後不再註冊', async () => {
    const { container } = setup(null)
    const cancel = watchForUpdate(container as never, './sw.js', vi.fn())
    cancel()
    await flush()
    expect(container.register).not.toHaveBeenCalled()
  })

  it('第一次安裝的頁面一直開著，之後部署了新版本 → 仍會提示', async () => {
    const { reg, container } = setup(null)
    const onWaiting = vi.fn()
    watchForUpdate(container as never, './sw.js', onWaiting)
    await flush()
    const first = new FakeSW()
    reg.installing = first
    reg.dispatchEvent(new Event('updatefound'))
    container.controller = first
    first.set('installed')
    expect(onWaiting).not.toHaveBeenCalled()
    const next = new FakeSW()
    reg.installing = next
    reg.dispatchEvent(new Event('updatefound'))
    next.set('installed')
    expect(onWaiting).toHaveBeenCalledWith(next)
  })
})
