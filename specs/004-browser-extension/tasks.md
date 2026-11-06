---
description: "004 瀏覽器外掛 的任務清單"
---

# Tasks: 階段 2：瀏覽器外掛

**Tests**: 必要（憲章 I：TDD）。

## Phase 1: 共用編輯器（packages/ui）

- [X] T001 建立 `packages/ui`（`@tinyimg/ui`，依賴 core、editor、react），把 `apps/web/src/App.tsx`、`src/lib/*`、`src/app.css` 搬過去，`App` 改名為 `TinyImgApp` 並加上 `incoming` prop；`apps/web/test`（單元測試與元件測試）一起搬到 `packages/ui/test`；調整 tsconfig、vitest 設定與 scripts
- [X] T002 在 `packages/ui/test/components/TinyImgApp.test.tsx` 寫測試：`incoming` 的 key 改變時會載入新圖片（顯示「處理中」，接著出現結果）；相同的 key 不會重複載入
- [X] T003 實作 `incoming`，讓 T002 通過；`apps/web/src/main.tsx` 改為使用 `@tinyimg/ui`
- [X] T004 跑 `apps/web` 的 E2E：不修改任何測試即全部通過（SC-003）

## Phase 2: User Story 1 — 截圖（P1）

- [X] T005 [P] [US1] 寫 `apps/extension/test/lib.test.ts`：`buildManifest`（版本取自 tag、去掉 v、權限清單只有 5 項、主機權限只在 optional）、`toCropRect`（dpr 換算、夾在範圍內、小於 4 px 回傳 null）、`nextPending`（id 遞增）、`needsHostPermission`（同網域、data:、blob: 不需要；其他網域回傳 origin pattern）
- [X] T006 [US1] 實作 `apps/extension/src/lib/*` 與 `manifest.config.ts`，讓 T005 通過
- [X] T007 [US1] 建立外掛的建置（vite.config、overlay 的 IIFE 建置、manifest 輸出）、`src/background.ts`（命令、選單、captureVisibleTab、框選、OffscreenCanvas 裁切、寫入 pending、開啟側邊欄或分頁）、`src/overlay.ts`、`src/editor/`（讀取 pending、監聽更新、傳給 `TinyImgApp`）
- [X] T008 [US1] 寫外掛 E2E `apps/extension/e2e/capture.spec.ts`：在測試頁面上，透過 service worker 觸發 capture-visible，編輯器顯示與頁面可見區域相同尺寸的圖片（SC-001 ≤ 2 秒）；觸發 capture-region 並用滑鼠框選，編輯器顯示該區域尺寸，Esc 取消後頁面上沒有殘留的遮罩；截圖 → 畫箭頭 → ⌘C，剪貼簿有 PNG（SC-002）；連續觸發兩次只保留最後一張；在 `chrome://` 頁面觸發會出現錯誤訊息

## Phase 3: User Story 2 — 右鍵圖片（P2）

- [X] T009 [US2] E2E：同網域圖片直接開啟；跨網域圖片顯示權限說明和「允許讀取」按鈕（Playwright 中以 `chrome.permissions` 的模擬或預先授權驗證授權後的路徑）；無法讀取時顯示錯誤
- [X] T010 [US2] 在編輯器頁面實作 `?src=` 的讀取、權限說明與請求，讓 T009 通過

## Phase 4: User Story 3 — 開啟方式（P3）

- [X] T011 [US3] E2E 與實作：設定開啟方式（側邊欄或新分頁，存在 `storage.local`）；側邊欄已開著時，再次截圖會取代圖片而不是開出第二個；編輯器頁面通過 axe 檢查（SC-007）

## Phase 5: User Story 4 — 發佈（P4）

- [X] T012 [P] [US4] 寫 `apps/extension/test/package.test.mjs`：打包腳本產生的 zip 檔名和 manifest 版本與輸入一致；掃描到遠端程式碼時以 exit 1 結束（SC-005、SC-006）
- [X] T013 [US4] 實作 `scripts/package.mjs`，並建立 `.github/workflows/release.yml`（在 `v*` tag 時觸發，用 `gh release create` 上傳 zip；權限為 `contents: write`）
- [X] T014 [US4] 寫 `apps/extension/PERMISSIONS.md`（每個權限的用途），並在 README 加上外掛的安裝與開發說明

## 未自動化驗證的部分（如實記錄）

- T009：E2E 建置帶有 `<all_urls>`，「請求網站讀取權限」的按鈕流程沒有被 E2E 涵蓋；只有 `needsHostPermission` 的單元測試。需要手動驗證：在正式建置中右鍵其他網域的圖片。
- T011：自動化無法打開側邊欄（`sidePanel.open` 需要使用者操作），側邊欄模式、以及側邊欄已開時再截圖會取代圖片，需要手動驗證。E2E 以「新分頁」模式驗證完整流程。
- 「連續快速觸發兩次截圖只保留最後一張」由 `nextPending` 的單元測試與編輯器「只處理更大的 id」的邏輯保證，沒有專門的 E2E。

## Phase 6: Polish

- [X] T015 `npm run verify` 加入外掛的建置、單元測試和 E2E；ci.yml 同步；全部通過
- [X] T016 在 quickstart 標註結果；更新 vision；在 draft 記錄「上架商店」需要使用者確認；交給 `/knowie-judge` 收尾
