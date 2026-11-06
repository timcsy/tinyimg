# Research：階段 0 地基

> 日期：2026-11-06。版本號來自當日 `npm view`。

## R1. 工具鏈版本

- **Decision**：Node 24、npm workspaces、Vite 8、Vitest 5、TypeScript **6.0.x**、Svelte 5、ESLint 10 + typescript-eslint 8、Prettier 3、Playwright 1.65。
- **Rationale**：TypeScript 最新版是 7.0（原生移植版），但 `typescript-eslint` 的 peer 範圍是 `>=4.8.4 <6.1.0`，`svelte-check` 是 `^5 || ^6`，所以選 6.0.x，等生態系跟上再升級。Vite 8 需要 Node `>=22.12`，本機和 CI 都用 Node 24。
- **Alternatives**：TypeScript 7，lint 和 svelte-check 會無法安裝；pnpm workspaces 在憲章中已定為 npm。

## R2. UI 框架

- **Decision**：Svelte 5（runes）。
- **Rationale**：vision 寫著「傾向 Svelte 5」。輸出的執行期很小，有助於達成「首次載入 JS ≤ 200 KB」；階段 1 的畫布 UI 也能沿用。階段 0 就定下來，避免之後重寫最小介面。
- **Alternatives**：React 19，執行期約 45 KB gzip，對預算較吃緊；原生 TS 加 DOM，階段 1 必須整個重寫。

## R3. 編碼策略：原生優先，WASM 補位

- **Decision**：
  - JPEG、WebP：優先用瀏覽器原生的 `OffscreenCanvas.convertToBlob({type, quality})`。如果回傳的 `type` 和要求的不同（例如 Safari 不支援 WebP 編碼），就延遲載入 `@jsquash/webp` 或 `@jsquash/jpeg`。
  - PNG：先用 `image-q` 量化色彩，再交給 `@jsquash/oxipng` 的 `optimiseRaw`，由它自動降成調色盤 PNG。
  - 縮放：瀏覽器用 canvas 的 `drawImage`（`imageSmoothingQuality = 'high'`）；core 另提供純 TS 的 box filter 實作，給測試和缺少原生 API 時使用。
- **Rationale**：SC-003 要求 12MP 照片 3 秒內完成，二分搜尋需要編碼約 6 次，原生編碼比 WASM 快好幾倍。PNG 原生編碼忽略 quality（experience 教訓 A），所以一定要量化。編碼器以介面注入，core 保持純邏輯，可在 Node 測試（憲章 III）。
- **Alternatives**：
  - 全部用 WASM：結果在各瀏覽器一致，但 12MP 會太慢。
  - `upng-js`：純 JS 的有損 PNG，但 2022 年後就沒有維護。
  - `libimagequant-wasm`：品質較好，但 API 還年輕，列為之後可替換的選項。

### R3 補充（實作時調整，2026-11-06）

- 原本打算整張圖交給 `image-q` 量化。實測 1MP 要 5.4 秒（建調色盤 3.9 秒、逐像素映射 1.5 秒），5MP 截圖約 27 秒，PNG 路徑要量化好幾次，完全不可行。
- 改為：只在最多 65,536 個取樣像素上用 Wu 演算法建調色盤，全圖映射用 5-bit RGB 加 4-bit alpha 的查表快取（`packages/core/src/quantize.ts`）。2880×1800 截圖在幾秒內完成，SC-002 仍然達標。
- 縮尺寸之後的輪次跳過無損 PNG：大尺寸時連 64 色都超標，縮小後的無損版本也不可能符合。
- 測試圖片：截圖產生器加入漸層、內嵌照片和反鋸齒文字，讓無損大小接近真實截圖（1920×1080 約 1.1MB）。原本的版本無損就已經小於 1MB，SC-002 測試因此沒有鑑別力，現在由 `neededWork` 斷言把關。

## R4. 壓到目標大小的演算法

- **Decision**：
  1. 決定格式。`auto` 時，有透明區域用 PNG，否則用 JPEG。JPEG 遇到透明區域時先鋪白底。
  2. 有損格式：先以品質上限編碼一次，符合目標就結束；否則在 `[0.3, 上限]` 之間對品質二分搜尋，最多 6 次，取符合目標的最高品質。
  3. PNG：依序嘗試無損最佳化，再量化成 256、128、64 色，取第一個符合目標的結果。
  4. 都不符合：縮小尺寸。縮放倍率為 `clamp(sqrt(目標 / 目前最小大小) × 0.95, 0.5, 0.9)`，回到步驟 2 或 3。最長邊到 320 px 為止。
  5. 縮到底仍不符合：狀態為 `unreachable`，附上過程中最小的結果。
  6. 原圖已不超過目標，而且格式為 `auto` 或與原圖相同：重新編碼的結果不比原圖小時，回傳原圖，狀態為 `original-fits`。
- **Rationale**：滿足 FR-001 到 FR-005。品質和大小大致單調，二分搜尋收斂快；搜尋下限 0.3 能避免為了大小犧牲到不可用的畫質，再壓不下來就縮尺寸。
- **Alternatives**：沿用舊版每次 ×0.9，收斂慢，而且沒有縮尺寸的備案；依大小模型預估品質，比較快但不穩定，可列為之後的最佳化。

### R4 補充（實作時調整，2026-11-06）

- PNG 色數階梯加入提早離開：量化結果超過目標 2 倍時，不再嘗試更少的色數，直接縮尺寸。
  理由：減少一半色數只能再省 25% 到 40%。實測 1200×1200 雜訊圖、目標 50 KB 時，256 色的結果是目標的 28 倍，
  原本仍會依序試 128 色、64 色。改了之後，從 10 次編碼、17.8 秒降到 6 次、6.5 秒（Node 環境）。
  起因是 Firefox E2E 在平行負載下超過 30 秒逾時。
- oxipng 最佳化等級從 2 改為 1：實測 1920×1080 截圖，無損 1,101,754 B / 3041 ms 變成 1,104,203 B / 1039 ms；
  256 色 343,777 B / 1631 ms 變成 346,214 B / 625 ms。檔案只大 0.2% 到 0.7%，速度快 2.6 到 3 倍。Level 0 會讓檔案大約 10%，不採用。
- PNG 階梯順序從「無損 → 256 → 128 → 64」改成「256 → 128 → 64」，而且 256 色符合時才補試無損（無損也符合就用無損，畫質較好）。
  理由：無損 PNG 幾乎不會比量化後小，所以 256 色都壓不下來時，試無損是浪費（又是最貴的一次編輯）。
- 瀏覽器內實測最壞情況（1200×1200 雜訊圖、目標 50 KB、PNG，結果為「無法達成」）的處理時間：Chromium 4.6 秒、Firefox 7.9 秒、WebKit 5.9 秒。
  之前 E2E 超過 30 秒，是 4 個 worker 平行跑三種瀏覽器時互搶 CPU 造成的；這類測試改標記為 `@serial`，用單一 worker 執行。
- 仍存在的風險：低效能裝置加上「無法達成」這種最壞情況（多輪量化），仍可能接近 30 秒逾時。這種情況會誠實回報為逾時，不會卡住。

## R5. Worker、取消與逾時

- **Decision**：只用一個 module worker，負責解碼、分析、壓縮。
  - 每個請求都有遞增的 `id`。worker 在每次編碼之間檢查是否已經有更新的請求，有的話就放棄目前這個（協作式取消）。
  - 主執行緒只接受最新 `id` 的結果（FR-009）。
  - 主執行緒設 30 秒逾時。逾時就 `terminate()` 並重建 worker，回報錯誤（FR-008）。
  - 解碼用 worker 內的 `createImageBitmap(blob)` 加 `OffscreenCanvas.getContext('2d').getImageData`。解碼失敗時回傳 `decode-failed`。
- **Rationale**：滿足 FR-007、FR-008、FR-009 與 SC-004。協作式取消可以保留已初始化的 WASM，逾時才用 terminate 當保險。
- **Alternatives**：每個新請求都 terminate，會浪費 WASM 初始化時間；用 Comlink，多一個相依套件，而訊息協定很小，不值得。

## R6. 動畫 GIF 偵測

- **Decision**：core 用純函式掃描 GIF 位元組，計算 Image Descriptor（`0x2C`）的數量，超過 1 就視為動畫，並附上警告。
- **Rationale**：不需要任何相依套件，容易用固定位元組測試。

## R7. 剪貼簿

- **Decision**：複製時，如果結果不是 PNG，先在 worker 轉成 PNG，再用 `navigator.clipboard.write([new ClipboardItem({'image/png': promise})])`。這裡用 Promise 形式是為了相容 Safari 對使用者手勢的要求。不支援時顯示訊息，建議改用下載；不再退回複製 Data URL 文字（FR-013）。
- **Rationale**：PNG 是唯一普遍支援寫入剪貼簿的圖片格式。舊版退回複製文字的做法，違反原則 2。

## R8. 測試策略

- **Decision**：
  - `packages/core`：用 Vitest，在 Node 環境執行。演算法用假的編碼器測試，可以精確控制「品質對應大小」的曲線。整合測試用真實的 `@jsquash/*`，WASM 透過 `init(fs.readFileSync(...))` 初始化，驗證 SC-001 與 SC-002。v8 覆蓋率門檻 90%，含行、函式、分支、語句。
  - 測試圖片：由 `packages/core/test/fixtures/generate.ts` 以固定種子產生，包含照片風格的漸層加雜訊、截圖風格的平塗色塊加文字筆畫、透明 PNG、超大圖，以及 2 幀的 GIF 位元組。結果確定，也沒有授權問題。
  - `apps/web`：用 Playwright（Chromium）跑 E2E，涵蓋三種放入方式、設定變更、複製（需要授予 clipboard 權限）、下載、錯誤訊息、暗色模式，並用 `@axe-core/playwright` 檢查無障礙。
  - CI 另有 bundle 大小檢查腳本，加總首次載入 JS 的 gzip 大小，上限 200 KB。
- **Rationale**：符合憲章 I 的測試分層與確定性要求。
- **Alternatives**：用真實照片當測試圖片，有授權和 repo 體積問題；Vitest browser mode，等階段 1 的元件測試變多再引入。

## R9. 發佈

- **Decision**：
  - `ci.yml`：在 pull_request 和 push 時執行，依序跑 lint、format check、typecheck、test 加覆蓋率、build、bundle size、E2E。
  - `pages.yml`：在 push 到 main 時執行，建置 `apps/web` 並用 `actions/deploy-pages` 部署。
  - Vite 的 `base` 設為 `/tinyimg/`。
- **Rationale**：符合憲章「技術與平台約束」與 history/001。
- **注意**：repo 的 Pages 設定必須把 Source 設成「GitHub Actions」。這個設定和 push 到 GitHub 都屬於對外動作，記錄在 draft 中，等使用者確認。
