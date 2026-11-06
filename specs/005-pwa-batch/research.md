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

## R5. 註冊時機（2026-11-06，實作中途；結論：沒有證據支持額外延後）

- **嘗試過的假設**：第一次造訪時，SW 預先快取數 MB 的檔案，會和使用者的第一張圖片搶資源。
- **第一次對照實驗**（Firefox，每組只跑一次）：允許 SW 時 SC-003 為 12.98 秒，封鎖 SW 時為 6.41 秒，看起來支持這個假設，
  於是加上「載入後再延後 10 秒才註冊」。
- **重複量測推翻了它**：延後之後交替量測，封鎖 SW 分別是 11.00、12.82 秒，允許 SW 分別是 21.67、5.70 秒。
  同一種模式的差距可達 4 倍，當時的 load average 為 48 到 55，結果完全被雜訊主導；第一次實驗的差距也落在雜訊範圍內。
- **Decision**：改回常見做法：在 `load` 之後、瀏覽器閒置時註冊；不加額外延遲，因為延遲有代價（更晚具備離線能力），
  卻沒有證據支持它的好處。之後在負載正常的機器或 CI 上再量測。
