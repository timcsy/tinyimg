# 006：否決 Firefox 版外掛
> 日期：2026-11-06

## 轉移
- 舊：vision 階段 3 規劃交付 Firefox 版外掛，成功標準為「Firefox 版外掛通過同一套 E2E 測試」
  （2026-11-06 knowie-init 時寫入）。狀態：superseded
- 新：外掛只做 Chromium 系（Chrome、Edge，同一份 Manifest V3 套件）。

## 為什麼變
使用者決定不需要 Firefox 版外掛（2026-11-06）。

## 不受影響的部分
- 網頁版仍依憲章支援 Firefox（最近兩個主要版本），E2E 也繼續在 Firefox 上執行。
- Firefox 網頁版的效能門檻仍待決定（[draft](../draft/2026-11-06-SC-003在Firefox與WebKit的預算.md)）。

## 如果要恢復
Firefox 不支援 `sidePanel` API，需要改用 `sidebar_action`；截圖改用 `tabs.captureVisibleTab` 的 Firefox 版本；
Playwright 也無法載入 Firefox 外掛，E2E 必須另外處理。

## 狀態
⚰️ 已否決（使用者決定）
