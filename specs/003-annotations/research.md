# Research：003 註解工具

> 日期：2026-11-06

## R1. 座標系：原圖座標

- **Decision**：註解的幾何一律存在原圖座標。使用者在畫面上的指標座標，透過 002 的 `mapPoint` 轉回原圖座標；
  顯示時再用 `sourceToOutputMatrix` 轉到畫面座標。線條粗細和文字大小也以原圖像素為單位，建立時依當下的縮放比例換算。
- **Rationale**：裁切、旋轉、翻轉、調整尺寸都是作用在原圖上的變換，註解存在原圖座標就會自然跟著走（FR-006、SC-004），
  不需要每次編輯都重新計算所有註解。
- **Alternatives**：存在輸出座標，那麼每次旋轉或裁切都要轉換所有註解，而且裁掉的部分無法還原（違反非破壞式）。

## R2. 匯出順序：原圖 → 馬賽克 → 向量註解 → applyEdit → 壓縮

- **Decision**：Worker 依序執行：先對解碼後的原圖套用馬賽克（純像素運算 `pixelate`），再把其他註解畫上去，
  接著套用 002 的 `applyEdit`，最後壓縮。
- **Rationale**：
  - 馬賽克必須真的破壞像素（FR-004）。在原圖上直接把每個方塊替換成平均色，匯出後不可能還原。
  - 其他註解畫在馬賽克之上，不會被打碼（邊界情況）。
  - `applyEdit` 仍然是最後一步的像素精確變換，002 的屬性測試保證不變。
- **Alternatives**：在輸出座標合成註解，那麼縮放後的線條會被重新取樣兩次。

## R3. 單一算繪器 `renderAnnotations`

- **Decision**：core 提供 `renderAnnotations(ctx, annotations)`，只依賴一個最小的 2D context 介面
  （`beginPath`、`moveTo`、`lineTo`、`stroke`、`fill`、`fillText`、`ellipse` 等）。預覽畫布和 Worker 的 OffscreenCanvas 共用它。
- **Rationale**：保證「看到的就是匯出的」；在 Node 中用會記錄呼叫的假 context 測試繪製指令。
- **馬賽克預覽**：預覽時在 EditorCanvas 以「縮小再以最近鄰放大」的方式，用預覽點陣圖模擬方塊化；匯出時則用 `pixelate` 精確計算。

## R4. 歷史：同一份文件、同一條歷史

- **Decision**：002 的 `Op` 加入 `annotate-add`、`annotate-update`、`annotate-remove`。文件重播時，編輯操作更新 EditState，
  註解操作更新註解清單。`reset` 只重設編輯（裁切、旋轉等），不刪除註解；要刪除註解請用刪除。
- **Rationale**：FR-008 要求共用同一條復原和重做歷史。002 的屬性測試只用編輯操作，不受影響。
- **編號**：由編號標記在清單中的順序衍生（FR-003），不儲存，刪除後自然遞補。

## R5. 互動層：SVG 命中區加上無障礙

- **Decision**：註解的外觀畫在 canvas 上（R3），另外疊一層 SVG 負責手勢、選取外框，以及每個註解的命中區。
  命中區是彼此並列的 `role="button"`（不巢狀，吸取 002 的教訓），`aria-label` 例如「箭頭 1，紅色」，Tab 可以切換。
- **文字輸入**：在點擊位置疊一個 HTML `<input>`；Enter 確認，Esc 取消。
