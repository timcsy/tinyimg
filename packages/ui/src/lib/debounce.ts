/**
 * 延後套用最後一次的值；flush 可以立刻套用待送出的值。
 * 用於編輯：連續拖曳時不必每一步都重新壓縮，但複製或下載前要先把最新的編輯送出，
 * 否則會拿到少了最後幾個註解的舊結果。
 */
export function createDebouncer<T>(apply: (value: T) => void, delayMs: number) {
  let timer: ReturnType<typeof setTimeout> | undefined
  let pending: { value: T } | null = null
  const fire = () => {
    clearTimeout(timer)
    timer = undefined
    const p = pending
    pending = null
    if (p) apply(p.value)
  }
  return {
    schedule(value: T) {
      pending = { value }
      clearTimeout(timer)
      timer = setTimeout(fire, delayMs)
    },
    /** 有待送出的值時立刻套用並回傳 true */
    flush(): boolean {
      if (!pending) return false
      fire()
      return true
    },
    cancel() {
      clearTimeout(timer)
      timer = undefined
      pending = null
    },
  }
}
