# 願景

## 問題陳述

拿到一張圖之後，常常要先「處理一下」才能交出去：標出重點、遮掉敏感資訊、壓到表單或
平台能接受的大小。現有做法摩擦很大：要開一個重量級的 app，要把圖上傳到不知名的網站，
或者在好幾個工具之間來回切換。舊版 TinyImg（2025-08-03）只能壓縮，而且預設的 PNG
其實壓不下來，壓縮失敗時也不會告訴使用者。

## 核心想法

一個入口，兩條最短路徑：

- **標註後分享**：截圖或貼上 → 標註（箭頭、文字、編號、馬賽克）→ 一鍵複製，貼到 Slack 或文件。
- **壓縮後上傳**：拖入或貼上 → 自動壓到目標大小 → 複製或下載，交給表單或網站。

全程在本機處理，網頁、PWA、瀏覽器外掛共用同一套核心。

## 現狀

- 舊版 v0（2025-08-03）：單頁 HTML、CSS、JS，從 CDN 載入 Bootstrap。可以上傳、貼上、
  壓縮、複製、下載，但有已知缺陷：PNG 壓不下來、壓縮率可能顯示負數、Promise 可能永遠
  不 resolve、有競態條件、透明背景轉成 JPEG 後變黑、CSS 載入順序錯誤。
- 2026-11-06：決定全面重構，並裝好開發流程工具：Spec Kit（憲章 v1.0.0）和 knowie。
- 階段 0（`specs/001-foundation/`）：壓縮核心和功能對等的網頁版已完成，本機測試全數通過；
  CI/CD workflow 已寫好，還沒在 GitHub 上跑過。需要使用者確認的對外動作見
  [draft](draft/2026-11-06-對外發佈需要使用者確認.md)。
- 階段 1（`specs/002-editor-canvas/`、`specs/003-annotations/`）已完成：非破壞式編輯、註解工具、畫布介面、
  快捷鍵、對比滑桿；UI 框架改為 React 19。Firefox 的效能門檻待使用者決定（見
  [draft](draft/2026-11-06-SC-003在Firefox與WebKit的預算.md)）。
- 階段 2（`specs/004-browser-extension/`）的程式已完成：編輯器抽成 `packages/ui`，Chrome/Edge 外掛可截圖、框選、右鍵編輯；
  剩下的兩條成功標準需要 push 與手動驗證側邊欄。
- 階段 3（`specs/005-pwa-batch/`）：PWA（離線、可安裝、分享目標）與批次處理已完成；剩下自動上架商店（需要使用者的帳號）。

## 架構

- **建置流程 + GitHub Actions 發佈**，取代只用 CDN 的做法。理由：MV3 外掛禁止遠端程式碼；
  lockfile 讓每次建置結果一致；打包後可以做最佳化。轉變的經過見
  [history/001](history/001-建置方式從只用CDN到打包加GitHub-Actions發佈.md)。
- **monorepo**：`packages/core`（圖片處理，可在 Worker 中執行）、`packages/editor`（UI）、
  `apps/web`、`apps/extension`。平台專屬的只有殼。（推導自原則 3）
- **非破壞式編輯**：原圖不動，編輯內容存成可序列化的文件模型，匯出時才合成。
- **壓縮核心**：先對品質做二分搜尋，壓不下來再縮小尺寸；PNG 走量化。WASM codec
  延遲載入，候選方案是 jSquash。（推導自原則 2：做不到就明說）
- UI 框架：React 19（2026-11-06 由 Svelte 5 改為 React，見 [history/005](history/005-UI框架從Svelte5到React.md)）。
- 未決：畫布函式庫（Konva 或 Fabric，階段 1 決定）、部署網域（暫用 GitHub Pages 預設網址）。

## 路線圖

### 階段 0：地基

- [ ] 完成

交付：monorepo、CI/CD、新的壓縮核心，以及一個最小但功能和舊版對等的網頁介面。
前置條件：無

**成功標準：**
- [ ] 每個 PR 自動執行型別檢查、lint、測試、建置；push 到 main 會自動部署到 GitHub Pages
- [x] 壓縮核心用固定的測試圖片驗證：結果不超過目標大小；做不到時回傳明確的「無法達成」，
      不會悄悄給出超過目標的檔案
- [x] PNG 輸入在相同目標大小下能實際縮小（量化或縮尺寸）
- [x] 壓縮在 Worker 中執行；`core` 覆蓋率至少 90%
- [x] 網頁版具備舊版全部功能：上傳、貼上、壓縮、複製、下載（2026-11-06，本機驗證）

### 階段 1：新 UI + 編輯器

- [x] 完成（2026-11-06）：畫布式介面、非破壞式編輯、註解工具，5 條成功標準全部達成。
  經過見 [episodes/2026-11-06-階段1畫布編輯器與註解](episodes/2026-11-06-階段1畫布編輯器與註解.md)；
  規格見 `specs/002-editor-canvas/`、`specs/003-annotations/`。

### 階段 2：瀏覽器外掛

- [ ] 完成

交付：Chrome 和 Edge 的 MV3 外掛，和網頁版共用 core 與 editor。
前置條件：階段 1

**成功標準：**
- [x] 截取目前分頁或框選區域，直接進入編輯器（2026-11-06，spec 004 的 E2E；可見區域 401 ms）
- [x] 在網頁圖片上按右鍵選「用 TinyImg 編輯」可以開啟（2026-11-06，同網域與跨網域圖片都有 E2E）
- [ ] 支援側邊欄和快捷鍵叫出（已實作；側邊欄無法自動化測試，待手動驗證，見 [draft](draft/2026-11-06-對外發佈需要使用者確認.md) 第 6 項）
- [ ] 推送 `v*` tag 會自動產生外掛 zip 和 GitHub Release；外掛核心流程有 E2E 測試（E2E 與打包腳本已完成；`release.yml` 尚未在 GitHub 上執行過，待 push）
- [x] 每個申請的權限都有記錄用途（2026-11-06，`apps/extension/PERMISSIONS.md`）

### 階段 3：擴充

- [ ] 完成

交付：PWA（離線、可安裝、出現在分享選單）、批次處理、自動上架商店。
（Firefox 版外掛已否決，見 [history/006](history/006-否決Firefox版外掛.md)；網頁版仍支援 Firefox。）
前置條件：階段 2

**成功標準：**
- [x] 斷網時仍能完整使用網頁版（2026-11-06，spec 005 的 E2E，三種瀏覽器）
- [x] 一次處理多張圖並打包下載（2026-11-06，spec 005 的 E2E）

## 關鍵延伸（主題觸發必讀）

| 觸發關鍵字 | MUST 讀 |
|---|---|
| Firefox、外掛支援的瀏覽器 | [`history/006-否決Firefox版外掛.md`](history/006-否決Firefox版外掛.md) |
| UI 框架、React、Svelte | [`history/005-UI框架從Svelte5到React.md`](history/005-UI框架從Svelte5到React.md) |
| 建置、CDN、部署、GitHub Actions | [`history/001-建置方式從只用CDN到打包加GitHub-Actions發佈.md`](history/001-建置方式從只用CDN到打包加GitHub-Actions發佈.md) |
| 具體技術約束、門檻 | [`.specify/memory/constitution.md`](../.specify/memory/constitution.md) |
