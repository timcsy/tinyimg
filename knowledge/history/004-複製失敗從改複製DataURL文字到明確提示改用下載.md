# 004：複製失敗時，從「改複製 Data URL 文字」到「明確提示改用下載」
> 日期：2026-11-06

## 轉移
- 舊：圖片寫入剪貼簿失敗時，改把 Data URL 文字放進剪貼簿，並顯示提示「圖片 Data URL 已複製到剪貼簿」
  （`b655abb:script.js` 第 319 行 `await this.copyImageAsDataUrl();`、第 366 行
  `await navigator.clipboard.writeText(reader.result);`）。狀態：superseded
- 新：一律以 PNG 寫入剪貼簿；不支援或失敗時顯示明確訊息並建議改用下載，不再複製文字
  （`apps/web/src/lib/Actions.svelte`、spec FR-013）。

## 為什麼變
使用者貼上時拿到的是一大串文字而不是圖片，卻先看到「已複製」的提示——這是把失敗包裝成成功，
直接違反原則 2「誠實比看起來成功重要」。

## 狀態
✅ 已採用（階段 0）
