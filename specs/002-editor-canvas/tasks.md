---
description: "002 非破壞式編輯與畫布介面 的任務清單"
---

# Tasks: 階段 1（上）：非破壞式編輯與畫布介面

**Input**: [plan.md](plan.md)、[spec.md](spec.md)、[research.md](research.md)、[data-model.md](data-model.md)、[contracts/](contracts/)

**Tests**: 必要（憲章 I：TDD）。每個實作任務之前都有一個「先寫、確認失敗」的測試任務。

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [ ] T001 建立 `packages/editor/`：`package.json`（name 為 `@tinyimg/editor`，依賴 `@tinyimg/core`，exports 指向 `./src/index.ts`）、`tsconfig.json`、`vitest.config.ts`（Node 環境；覆蓋率門檻 90%）
- [ ] T002 在 `apps/web` 加入元件測試的設定：安裝 `@vitest/browser-playwright@5.1` 與 `vitest-browser-svelte@3.1`；新增 `apps/web/vitest.components.config.ts`（browser mode，使用 Chromium，include 為 `test/components/**/*.test.ts`）與 script `test:components`；根目錄的 `verify` 和 `ci.yml` 也要加入這一步
- [ ] T003 讓 `apps/web` 依賴 `@tinyimg/editor`；確認 typecheck、lint、build 都通過

## Phase 2: Foundational（core 的編輯像素運算）

- [ ] T004 [P] 在 `packages/core/test/edit.test.ts` 寫測試：`identityEdit`；`orientedSize`（rotation 為奇數時寬高互換）；`applyEdit` 的裁切、旋轉 1/2/3 次、flipX，以已知像素位置驗證，例如 400×300 旋轉一次後，原本左上的像素出現在右上；輸出尺寸與 oriented 不同時呼叫 resize；不修改輸入；`mapPoint`
- [ ] T005 實作 `packages/core/src/edit.ts`，讓 T004 通過，並從 `index.ts` 匯出
- [ ] T006 在 `packages/core/test/worker.test.ts` 加測試：compress 帶有 `edit` 時，結果尺寸等於 `edit.output`；再到 `client.test.ts` 加測試：`compress(file, req, edit)` 會傳送 edit
- [ ] T007 修改 `packages/core/src/worker.ts` 與 `client.ts`，讓 T006 通過

---

## Phase 3: User Story 2 — 非破壞式的基本編輯 (P2，但它是 US1 與 US3 的資料基礎，先做)

### Tests（先寫，確認失敗）

- [ ] T008 [P] [US2] 寫 `packages/editor/test/ops.test.ts`：`applyOp` 處理每種 Op 後的 EditState；裁切座標以目前畫面為準，反向映射回原圖並取整數；旋轉 4 次或翻轉 2 次會回到原狀；resize 範圍為 1 px 到 oriented 的 4 倍，超出範圍時丟出 RangeError；reset 回到 identity
- [ ] T009 [P] [US2] 寫 `packages/editor/test/property.test.ts`：寫一個參考實作，逐步在 RawImage 上套用每個 Op（不含 resize）。用固定種子產生 200 組、長度 1 到 50 的隨機序列，驗證 `applyEdit(img, state)` 與參考實作逐像素相同（SC-002）
- [ ] T010 [P] [US2] 寫 `packages/editor/test/document.test.ts`：push 會截掉 redo；undo、redo 的邊界；上限 100 步；undo 到底等於 identity、redo 到底等於最終狀態（SC-003，用隨機序列驗證）；`deserialize(serialize(doc))` 與原文件等價；不合法的 JSON 丟出錯誤
- [ ] T011 [P] [US2] 寫 `packages/editor/test/crop.test.ts`：依比例限制拖曳角落（1:1 維持正方形）；夾在圖片範圍內；最小 1×1；鍵盤移動 1 px，加 Shift 為 10 px，加 Alt 為調整大小

### Implementation

- [ ] T012 [US2] 實作 `packages/editor/src/ops.ts`，讓 T008、T009 通過
- [ ] T013 [US2] 實作 `packages/editor/src/document.ts`，讓 T010 通過
- [ ] T014 [P] [US2] 實作 `packages/editor/src/crop.ts`，讓 T011 通過
- [ ] T015 [US2] 寫元件測試 `apps/web/test/components/CropOverlay.test.ts`（拖曳控制點、鍵盤、Enter、Esc）與 `Toolbar.test.ts`（按鈕名稱、disabled 狀態、方向鍵移動焦點），確認失敗
- [ ] T016 [US2] 實作 `apps/web/src/lib/editor.svelte.ts`（文件加 runes，編輯後觸發 workspace 以 edit 重新壓縮）、`EditorCanvas.svelte`（以預覽點陣圖依 EditState 算繪）、`CropOverlay.svelte`、`Toolbar.svelte`、`ResizeDialog.svelte`，讓 T015 通過
- [ ] T017 [US2] 寫 E2E `apps/web/e2e/editor.spec.ts`：裁切後的 output-size 正確、旋轉後寬高互換、3 次復原回到原尺寸、全部還原後可以再復原、編輯後的壓縮結果尺寸與 output-size 一致

---

## Phase 4: User Story 1 — 兩個操作完成「壓縮後上傳」 (P1)

- [ ] T018 [P] [US1] 寫 `apps/web/test/shortcuts.test.ts`：keymap 涵蓋 FR-010 的每一個快捷鍵；焦點在 input、select、textarea、contenteditable 時不攔截單鍵快捷鍵與 ⌘C；⌘S 會 preventDefault
- [ ] T019 [US1] 實作 `apps/web/src/lib/shortcuts.ts`，並在 App 中掛上 window keydown，讓 T018 通過；⌘C 在結果還沒完成時，等待結果後再複製
- [ ] T020 [US1] 在 E2E `apps/web/e2e/editor.spec.ts` 加測試：貼上後按 ⌘C，Chromium 讀回剪貼簿得到 PNG，全程只有 2 個使用者操作（SC-001）；按 ⌘S 會下載；焦點在目標大小欄位時按 ⌘C 不會觸發圖片複製

---

## Phase 5: User Story 3 — 對比與鍵盤優先 (P3)

- [ ] T021 [P] [US3] 寫元件測試 `apps/web/test/components/CompareSlider.test.ts`：方向鍵每次 5%、Home、End、aria-valuetext、拖曳
- [ ] T022 [US3] 實作 `CompareSlider.svelte` 與 `ShortcutHelp.svelte`，讓 T021 通過
- [ ] T023 [US3] 寫 E2E：只用鍵盤完成「放入 → 裁切 → 旋轉 → 復原 → 對比 → 複製」；淺色與暗色的 axe 檢查零違規；360 px 寬時沒有水平捲軸；按 ? 會開啟快捷鍵說明（SC-005）
- [ ] T024 [US3] 寫 `@perf` E2E：12MP 圖片旋轉後 100 ms 內預覽更新（SC-004，在頁面中以 performance 標記量測）；編輯後 3 秒內得到新結果（SC-007）

---

## Phase 6: Polish

- [ ] T025 [P] 更新 001 的 E2E，使它符合新版面（並排比較改成畫布加對比滑桿），沿用 001 合約的 testid
- [ ] T026 執行 `npm run verify` 全部通過；`npm run size` 確認仍在 200 KB 預算內
- [ ] T027 在 quickstart.md 標註實際結果；交給 `/knowie-judge` 收尾

## Dependencies

Setup → Foundational（core edit）→ US2（editor 與編輯 UI）→ US1（快捷鍵與 2 個操作）→ US3 → Polish。
US1 依賴 US2 的畫布版面；資料層（T008 到 T014）不依賴 UI，可以先完成。
