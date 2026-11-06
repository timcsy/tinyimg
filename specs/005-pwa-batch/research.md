# Research：005 PWA 與批次處理

> 日期：2026-11-06

## R1. Service worker：自己寫，不引入 vite-plugin-pwa、Workbox

- **Decision**：`apps/web` 的 Vite plugin 在 `generateBundle` 收集所有輸出檔（HTML、JS、CSS、WASM、worker、圖示），
  產生 `sw.js`：install 時預先快取這份清單；activate 時刪除舊版本的快取；fetch 時同源的 GET 一律快取優先，
  導覽請求回傳快取的 `index.html`。快取名稱帶建置雜湊，每次建置都會產生新的版本。
- 路由判斷（`precache`、`share`、`network`）、快取名稱、清單過濾寫成純函式（`apps/web/src/sw-core.ts`），在 Node 測試。
- **Rationale**：需求只有「全部預先快取，加上分享目標」，自己寫大約 80 行；Workbox 會多一層相依與設定（原則 V）。

## R2. 更新提示

- **Decision**：`main.tsx` 註冊 SW。偵測到 `updatefound` 且新的 SW 進入 installed 狀態，同時頁面已有 controller 時，
  顯示「有新版本，重新整理以更新」與按鈕。不呼叫 `skipWaiting`，所以不會在編輯途中被換掉（FR-002）。

## R3. 分享目標（Web Share Target，POST multipart）

- **Decision**：manifest 的 `share_target` 以 POST 送到 `./share`。SW 攔截後，把檔案存到 `share-inbox` 快取
  （每個檔案一個 Response，保留檔名與類型），然後回傳 303 導向 `./?share=<時間戳>`。頁面讀取並刪除 inbox 中的檔案：
  一張就送進單張編輯器，多張就進入批次。

## R4. 批次處理

- **Decision**：`packages/ui` 新增純函式 `runBatch(items, compress, { isCancelled, onUpdate })`，依序處理、互不影響；
  批次使用**獨立的 compressor**，不會和單張編輯器互相取代（draft 候選 8）。
  zip 以 store 模式（不壓縮）實作 `createZip(entries)`，包括 local header、central directory 與 CRC-32；
  檔名重複時加上「 (2)」之類的序號。
- **Alternatives**：fflate 或 JSZip 功能完整，但 store 模式只要約 60 行，而且可以完整測試。
