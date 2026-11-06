# Research：002 非破壞式編輯與畫布介面

> 日期：2026-11-06

## R1. 畫布函式庫：自建，而不用 Konva 或 Fabric

- **Decision**：自建「純 TS 文件模型 + Canvas2D 預覽 + SVG 互動層」。
- **Rationale**：
  - 匯出必須在 Worker 中以原圖解析度進行（FR-006）。Konva 和 Fabric 的場景圖綁定 DOM，無法直接放進 Worker，
    結果會變成「預覽一套、匯出另一套」，兩者容易不一致。自建時，預覽和匯出共用同一份標準化的編輯狀態（R2）。
  - 體積：Fabric 約 90 KB gzip、Konva 約 50 KB gzip；目前首次載入只有 19.7 KB，自建可以把預算留給 003 的註解工具。
  - 無障礙與測試：SVG 的控制點是真正的 DOM 元素，可以加 `role`、`aria-label`，E2E 也能直接定位。
    畫在 canvas 上的控制點做不到這些。
- **Alternatives**：
  - Konva：互動能力成熟，但有 Worker 與體積的問題。
  - Fabric：功能最多，但最重，而且 v6 的 API 仍在變動。
  - 等 003 的註解工具真的需要複雜的物件選取、變形時，再重新評估。到時候 SVG 層同樣可以承接。

## R2. 編輯的標準化狀態（EditState）

- **Decision**：任何編輯操作序列都化簡成一個標準化的 `EditState`：
  `{ crop: 原圖座標的整數矩形, rotation: 0|1|2|3, flipX: boolean, output: {width, height} }`，
  也就是「先在原圖上裁切 → 做 D4 變換（90° 旋轉加翻轉）→ 縮放到輸出尺寸」。
  - 操作（Op）用來保存歷史；EditState 是由操作重播推導出來的，用於預覽和匯出。
  - 裁切的座標是「當下看到的畫面」，推導時反向映射回原圖座標並取整數。
- **Rationale**：
  - 90° 旋轉、翻轉、整數裁切都是**像素精確**的運算（不需要重新取樣），所以能把 SC-002 寫成逐像素驗證。
    縮放只在最後做一次，避免多次重新取樣累積誤差。
  - 狀態很小、可以序列化（FR-002）；復原或重做只要移動游標再重播，成本是 O(操作數) 的純數學計算。
- **Alternatives**：
  - 累積 2D 仿射矩陣：可以表達任意角度，但浮點誤差會破壞像素精確，而本 spec 不需要任意角度。
  - 每一步都保存點陣快照：12MP 的圖片每步約 48 MB，100 步不可行。

## R3. 匯出放在 core 的 Worker 中

- **Decision**：把 `EditState` 型別和像素運算 `applyEdit(raw, state)` 放在 `packages/core`，屬於影像處理。
  Worker 的 `compress` 訊息新增選填的 `edit` 欄位：解碼後先套用編輯，再交給 `compressToTarget`。
  `packages/editor` 負責操作、歷史、幾何推導（Op → EditState），並依賴 core。
- **Rationale**：依賴方向是 editor → core，避免循環依賴。匯出沿用階段 0 的取代與逾時機制（FR-012）。
- **Alternatives**：在主執行緒匯出，會造成 12MP 的長任務，違反 SC-004 與憲章 IV。

## R4. 預覽

- **Decision**：放入圖片時，用 `createImageBitmap` 產生最長邊 2048 px 的預覽點陣圖。畫布依照 EditState，
  透過 `setTransform` 和 `drawImage` 算繪，只畫預覽，不碰原圖。
- **Rationale**：SC-004 要求 12MP 的圖片在 100 ms 內更新預覽。預覽約 4MP 以下，drawImage 只需要數毫秒。

## R5. 元件測試

- **Decision**：引入 Vitest browser mode（`@vitest/browser-playwright` 5.1 加 `vitest-browser-svelte` 3.1），
  在真實的 Chromium 中測試 CropOverlay、Toolbar、CompareSlider 的互動行為。
- **Rationale**：依 draft「元件測試的適用範圍」的推薦，從編輯器開始落實憲章 I 的元件測試。
  在真實瀏覽器裡跑，指標事件和鍵盤事件才可靠；happy-dom 對 pointer capture 的支援不完整。
- **Alternatives**：用 `@testing-library/svelte` 加 happy-dom，比較輕，但拖曳行為不可信。

## R6. 快捷鍵

- **Decision**：在 window 上集中處理 keydown，用一張 keymap 表（`apps/web/src/lib/shortcuts.ts`，純函式可測）
  把按鍵事件對應到命令。事件目標是 `input`、`select`、`textarea` 或 contenteditable 時，跳過單鍵快捷鍵與 ⌘C。
  ⌘S 一律 `preventDefault`。
- **Rationale**：FR-010 的規則需要能被單元測試完整驗證，而不是散落在各個元件裡。
