---
description: "003 註解工具 的任務清單"
---

# Tasks: 階段 1（下）：註解工具

**Input**: [plan.md](plan.md)、[spec.md](spec.md)、[research.md](research.md)、[data-model.md](data-model.md)、[contracts/](contracts/)

**Tests**: 必要（憲章 I：TDD）。

## Phase 1: Foundational（core）

- [X] T001 [P] 在 `packages/core/test/annotations.test.ts` 寫測試：`pixelate` 在區域內每個方塊都只剩單一顏色、區域外像素完全不變、不修改輸入、區域被夾在影像範圍內；`mosaicBlock` 的值為 max(12, ceil(短邊 / 20))；`renderAnnotations` 對每種註解發出預期的繪製指令（用假的 Ctx2D 記錄），且會略過 mosaic；`applyAnnotations` 先 pixelate 再呼叫 draw，沒有向量註解時不呼叫 draw
- [X] T002 實作 `packages/core/src/annotations.ts`，讓 T001 通過，並從 `index.ts` 匯出；完成後做一次注入錯誤檢查（讓 pixelate 漏掉最後一個方塊），確認測試會失敗
- [X] T003 在 `packages/core/test/worker.test.ts` 加測試：帶有 annotations 時，結果不是 original-fits；drawVectors 這個 dep 會收到向量註解；馬賽克在 applyEdit 之前執行（用像素驗證）
- [X] T004 修改 `packages/core/src/worker.ts`、`client.ts`（`compress` 帶 annotations）、`codecs/browser.ts`（`drawVectors`：用 OffscreenCanvas 執行 putImageData、renderAnnotations、getImageData）、`worker-entry.ts`，讓 T003 通過

## Phase 2: User Story 3 的資料層（editor；US1 與 US2 都依賴它）

- [X] T005 [P] [US3] 寫 `packages/editor/test/annotate.test.ts`：annotate-add、update、remove 的重播；`documentState`；`reset` 不刪除註解；`stepNumber` 刪除後會遞補；`hitTest` 依最上層與容許誤差命中；`moveAnnotation` 移動所有點
- [X] T006 [P] [US3] 在 `packages/editor/test/property.test.ts` 加入混合序列（編輯加註解）：全部復原等於 identity 且沒有註解，全部重做等於最終狀態（SC-003）；SC-004：在測試圖片上放標記點註解，經過隨機的裁切、旋轉、翻轉後，匯出影像中標記的位置等於 `sourceToOutputMatrix` 映射的位置（誤差不超過 1 px）
- [X] T007 [US3] 實作 `packages/editor/src/ops.ts`（註解 Op）、`document.ts`（`documentState`）、`annotate.ts`，讓 T005 與 T006 通過；並確認 002 的屬性測試仍然通過

## Phase 3: User Story 1 — 貼上、標註、複製 (P1) 🎯

- [X] T008 [P] [US1] 擴充 `apps/web/test/shortcuts.test.ts`：V、P、H、A、B、E、T、N、M 對應工具；Delete 與 Backspace 刪除；Esc 回到選取工具；焦點在文字欄位時不攔截
- [X] T009 [P] [US1] 寫元件測試 `apps/web/test/components/AnnotationLayer.test.tsx`：拖曳產生箭頭、矩形、橢圓、馬賽克（小於 3 px 不建立）；畫筆收集點列；點擊建立文字輸入框，Enter 確認、空字串或 Esc 不建立；編號連續點擊產生 1、2、3；命中區是並列的 role=button，帶有可讀名稱
- [X] T010 [US1] 實作 `shortcuts.ts` 的工具快捷鍵、`AnnotationLayer.tsx`、`AnnotationBar.tsx`（工具、顏色、粗細），在 `EditorCanvas.tsx` 用 renderAnnotations 加上馬賽克預覽，並在 `App.tsx` 與 `useEditor.ts` 串接（壓縮時帶 annotations），讓 T008 與 T009 通過
- [X] T011 [US1] 寫 E2E `apps/web/e2e/annotations.spec.ts`：貼上 → 箭頭 → 矩形 → 文字 → ⌘C；在 Chromium 讀回剪貼簿的 PNG，檢查箭頭位置的像素是紅色（SC-001）

## Phase 4: User Story 2 — 馬賽克 (P2)

- [X] T012 [US2] 寫 E2E：在已知內容的測試圖片（棋盤格）上框選馬賽克 → 下載 → 解碼後確認區域內的方塊為單一顏色、區域外不變；旋轉後再匯出，馬賽克仍覆蓋相同內容（SC-002、SC-004）

## Phase 5: User Story 3 — 調整與管理 (P3)

- [X] T013 [US3] 元件測試加入：選取、方向鍵移動（Shift 加速）、Delete 刪除、改顏色只影響選取的註解；Tab 在註解之間切換
- [X] T014 [US3] 實作選取、移動、刪除、修改樣式，讓 T013 通過
- [X] T015 [US3] 寫 E2E：只用鍵盤完成（選工具 → Enter 建立 → 方向鍵移動 → Delete → ⌘Z 復原）；axe 零違規（淺色與暗色，含有註解與選取的狀態）（SC-005）；200 個註解時拖曳更新 ≤ 50 ms（SC-006，`@serial`）

## Phase 6: Polish

- [X] T016 執行 `npm run verify` 全部通過；`npm run size` 確認 ≤ 200 KB
- [X] T017 在 quickstart.md 標註結果；更新 vision 的階段 1 成功標準；交給 `/knowie-judge` 收尾

## Dependencies

Phase 1（core）→ Phase 2（editor）→ US1 → US2 → US3 → Polish。
