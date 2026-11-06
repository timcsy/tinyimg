# 005：UI 框架從 Svelte 5 到 React
> 日期：2026-11-06

## 轉移
- 舊：Svelte 5（runes）。決定於階段 0 的 plan（`specs/001-foundation/research.md` R2），理由是執行期小、
  有利於 200 KB 預算。階段 0 的網頁版就是用它完成的。狀態：superseded
- 新：React 19 + Vite。

## 為什麼變
- 使用者判斷：React 比較好維護。生態系和人力最普及，元件、測試、無障礙工具都有成熟的選擇。
- 原本選 Svelte 的主要理由是體積。實測首次載入 JS 只有 19.7–27.6 KB，預算是 200 KB；
  React 加 React DOM 約 60 KB（gzip），仍在預算內，這個理由已經不再關鍵。
- 成本有限：核心邏輯本來就和 UI 分開（原則 3、憲章 III）。`packages/core` 和 `packages/editor`
  完全不受影響；`apps/web` 的純 TS 模組（workspace、shortcuts、format、output、strings）也可以沿用，
  只需要改寫元件。

## 代價與後續
- Svelte 編譯時期的無障礙警告沒有了。`eslint-plugin-jsx-a11y` 目前不支援 ESLint 10，
  所以改由 E2E 和元件測試裡的 axe 檢查來把關。
- 過程備註：中途有一個 commit（`5c26e6e`）把「React」誤寫成「Rust」，並引用了一個不存在的 history/005。
  使用者確認是打錯字，該 commit 已撤銷（reset 到 `ab6ecdc`）。

## 狀態
✅ 已採用（從 spec 002 起生效）
