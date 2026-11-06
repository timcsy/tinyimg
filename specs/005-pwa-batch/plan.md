# Implementation Plan: 階段 3：PWA 與批次處理

**Branch**: `005-pwa-batch` | **Date**: 2026-11-06 | **Spec**: [spec.md](spec.md)

## Summary

自己寫 service worker，預先快取所有建置輸出（含 WASM），並處理分享目標；更新時只提示，不強制重新整理。
批次處理用獨立的 compressor 依序處理，以 store 模式的 zip 下載。不新增執行期相依。見 [research.md](research.md)。

## Constitution Check

| 原則 | 檢查 | 結果 |
|---|---|---|
| I. 測試先行 | sw-core、zip、batch 的純函式先寫測試；E2E 實際斷網、分享、批次 | ✅ |
| II. 隱私優先 | 離線快取只存網站本身的檔案；分享的圖片只暫存在本機快取，讀取後立即刪除 | ✅ |
| III. 核心與介面分離 | 批次與 zip 放在 `packages/ui`（外掛也能使用）；SW 屬於網頁版的殼 | ✅ |
| IV. UX 與無障礙 | 批次清單與進度有 ARIA 狀態；更新提示不打斷工作 | ✅ |
| V. 簡潔 | 不引入 Workbox、zip 函式庫 | ✅ |

## Project Structure

```text
apps/web/src/sw-core.ts        # 純函式：路由、快取名稱、清單
apps/web/src/sw.ts             # service worker（由 plugin 注入清單後輸出 sw.js）
apps/web/public/manifest.webmanifest、icon-192.png、icon-512.png
apps/web/src/main.tsx          # 註冊 SW、更新提示、讀取 share inbox
packages/ui/src/lib/zip.ts、batch.ts、BatchView.tsx
packages/ui/src/TinyImgApp.tsx # 多張圖片時進入批次模式
```
