# Research：004 瀏覽器外掛

> 日期：2026-11-06

## R1. 共用編輯器：`packages/ui`

- **Decision**：把 `apps/web/src` 的 App、元件、hooks、純 TS 模組和樣式搬到 `packages/ui`，並匯出 `<TinyImgApp incoming={...} />`。
  `incoming` 是 `{ file: File, key: string } | null`，key 改變時就當作「放入新圖片」。`apps/web` 只剩進入點；
  單元測試和元件測試跟著程式碼搬到 `packages/ui`，E2E 留在 `apps/web`，並且不修改（SC-003）。
- **Rationale**：憲章 III 規定「編輯器 UI MUST 以可重用套件提供」；外掛如果直接匯入 `apps/web/src`，app 之間會互相依賴。
- **Worker**：`createCompressor` 用 `new URL('./worker-entry.ts', import.meta.url)`，在兩個 Vite 建置中都能正確打包。

## R2. 外掛建置：兩次 Vite 建置，不引入外掛建置框架

- **Decision**：
  - 第一次以 ES 模組建置 `editor.html` 和 `background.ts`（MV3 的 service worker 宣告 `"type": "module"`）。
  - 第二次用 lib 模式把框選遮罩建置成 IIFE（內容腳本不能是 ES 模組）。
  - 最後由一支小腳本寫入 `manifest.json`，版本號取自環境變數或 tag。
- **Alternatives**：CRXJS 或 WXT 功能完整，但會多一層相依和設定；需求只有 3 個進入點，自己寫比較簡單（原則 V）。

## R3. 圖片交接：`chrome.storage.session` 只保留最新的一張

- **Decision**：background 截圖或裁切後，把 `{ id, dataUrl, source }` 寫進 `storage.session` 的 `pending` 欄位，並覆蓋舊的。
  編輯器頁面載入時讀取一次，之後監聽 `storage.onChanged`；拿到 id 更新的圖片就取代目前的圖片。
- **Rationale**：Service worker 隨時可能被瀏覽器終止，記憶體裡的資料不可靠；`storage.session` 不會寫入磁碟，也符合隱私原則。
  只保留最新的一張，連續截圖時就不會混用兩張（draft 候選 8：被取代的請求要明確處理）。
- **大小**：可見區域的 PNG 通常在數 MB 以內；超過 `storage.session` 的配額時會改用 JPEG（品質 0.95）再試，仍失敗就明確告知使用者。

## R4. 截圖、框選、右鍵

- **可見區域**：`chrome.tabs.captureVisibleTab`（使用者觸發快捷鍵或圖示時取得 `activeTab`）。
- **框選**：用 `scripting.executeScript` 注入 IIFE 遮罩，取得選取的矩形和 `devicePixelRatio`；
  移除遮罩後再截圖，在 service worker 裡用 `OffscreenCanvas` 裁切。裁切座標的換算放在純函式中，有單元測試。
- **右鍵圖片**：background 用 `src` 參數開啟編輯器，由編輯器頁面 `fetch` 圖片。
  如果是跨網域圖片又沒有權限，就顯示「允許讀取 {網站} 的圖片」按鈕，按下後呼叫 `chrome.permissions.request`；
  權限請求必須由使用者操作觸發，所以不能在 service worker 裡直接請求。

## R5. 權限

| 權限 | 用途 |
|---|---|
| `activeTab` | 使用者觸發時截取目前分頁、注入框選遮罩 |
| `contextMenus` | 「用 TinyImg 編輯」、「框選區域截圖」選單 |
| `sidePanel` | 在側邊欄開啟編輯器 |
| `storage` | 交接圖片（`storage.session`，不寫入磁碟）和開啟方式設定 |
| `scripting` | 注入框選遮罩（只在使用者觸發時） |
| `optional_host_permissions: <all_urls>` | 讀取其他網域的圖片；第一次需要時，針對該網站逐一請求 |

## R6. 測試

- **純函式**（Node 環境）：manifest 產生、交接狀態、框選座標換算、權限判斷。
- **E2E**：Playwright 用 `launchPersistentContext` 加上 `--load-extension` 載入建置後的外掛（只支援 Chromium）。
  原生的右鍵選單和快捷鍵無法自動化，所以改成透過 service worker 直接呼叫對應的處理函式。
- **遠端程式碼掃描**：建置後掃描套件，不能出現 `http(s)://` 的 `import`、`importScripts` 或 `<script src>`（SC-005）。
