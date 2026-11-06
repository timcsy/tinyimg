import { describe, expect, it, vi } from 'vitest'
import { createDebouncer } from '../src/lib/debounce'

describe('createDebouncer', () => {
  it('延遲後只套用最後一次', () => {
    vi.useFakeTimers()
    const apply = vi.fn()
    const d = createDebouncer(apply, 200)
    d.schedule(1)
    d.schedule(2)
    expect(apply).not.toHaveBeenCalled()
    vi.advanceTimersByTime(200)
    expect(apply).toHaveBeenCalledExactlyOnceWith(2)
    vi.useRealTimers()
  })
  it('flush：有待送出的值時立刻套用，計時器不會再套用一次', () => {
    vi.useFakeTimers()
    const apply = vi.fn()
    const d = createDebouncer(apply, 200)
    d.schedule('x')
    expect(d.flush()).toBe(true)
    expect(apply).toHaveBeenCalledExactlyOnceWith('x')
    vi.advanceTimersByTime(500)
    expect(apply).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
  it('flush：沒有待送出的值時什麼都不做', () => {
    const apply = vi.fn()
    const d = createDebouncer(apply, 200)
    expect(d.flush()).toBe(false)
    expect(apply).not.toHaveBeenCalled()
  })
  it('cancel：丟掉待送出的值', () => {
    vi.useFakeTimers()
    const apply = vi.fn()
    const d = createDebouncer(apply, 200)
    d.schedule(1)
    d.cancel()
    vi.advanceTimersByTime(500)
    expect(apply).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
})
