---
description: "005 PWA 與批次處理 的任務清單"
---

# Tasks: 階段 3：PWA 與批次處理

## Phase 1: 批次（US3，純函式先行）

- [ ] T001 [P] [US3] 寫 `packages/ui/test/zip.test.ts`：產生的 zip 可以被 `unzip` 解開，檔案內容與輸入完全相同；CRC-32 正確（已知向量）；空清單也是合法的 zip；中文檔名使用 UTF-8 旗標
- [ ] T002 [P] [US3] 寫 `packages/ui/test/batch.test.ts`：依序處理（同時只有一個在處理）；某一張失敗不影響其他；取消後不再開始新的項目；`onUpdate` 回報每個狀態轉換；`uniqueNames` 為重複的檔名加上序號
- [ ] T003 [US3] 實作 `zip.ts`、`batch.ts`，讓 T001 與 T002 通過
- [ ] T004 [US3] 實作 `BatchView.tsx` 與 `TinyImgApp` 的多檔模式（放入區接受多檔；貼上或拖曳多張時進入批次），並寫元件測試：狀態列表、進度、全部下載、取消、點選某張以開啟單張編輯
- [ ] T005 [US3] 寫 E2E `apps/web/e2e/batch.spec.ts`：選 3 張（其中 1 張損毀）→ 2 張完成、1 張錯誤 → 下載 zip → 解開後有 2 個檔案、檔名不重複；點選其中一張會開啟單張編輯器

## Phase 2: PWA（US1）

- [ ] T006 [P] [US1] 寫 `apps/web/test/sw-core.test.ts`：`routeFor`（導覽 → index.html、同源 GET → 快取、POST ./share → share、跨源 → network）；`cacheName` 帶版本；`precacheList` 會排除 `.vite/manifest.json` 與 sourcemap
- [ ] T007 [US1] 實作 `sw-core.ts`、`sw.ts`、Vite plugin（輸出 sw.js 和清單）、`manifest.webmanifest`、圖示，以及 `main.tsx` 的註冊與更新提示
- [ ] T008 [US1] 寫 E2E `apps/web/e2e/pwa.spec.ts`：第一次載入並等 SW 啟用後 → `context.setOffline(true)` → 重新整理 → 放入 → 壓縮 → 下載成功（SC-001）；manifest 可取得且欄位正確

## Phase 3: 分享目標（US2）

- [ ] T009 [US2] 實作 SW 的 share 處理（存入 `share-inbox` 快取，303 導向 `?share=`）以及頁面讀取 inbox；寫 E2E：在頁面內以 `fetch('./share', { method: 'POST', body: FormData })` 模擬分享一張、兩張、非圖片，分別進入單張、批次、錯誤

## Phase 4: Polish

- [ ] T010 `npm run verify` 全部通過；首次載入 ≤ 200 KB
- [ ] T011 在 quickstart 標註結果；更新 vision；交給 `/knowie-judge` 收尾
