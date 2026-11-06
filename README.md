# TinyImg

在你的裝置上把圖片壓到目標大小，然後一鍵複製或下載。圖片不會上傳到任何地方。

> 專案正在重構：網頁版、編輯器、標註、瀏覽器外掛、PWA 與批次處理都已完成，還沒正式發佈。
> 路線圖見 [`knowledge/vision.md`](knowledge/vision.md)。

## 功能

- 拖曳、選擇檔案或直接貼上（Ctrl/Cmd + V）放入圖片
- 自動壓到目標大小（預設 1 MB）：有損格式調整品質，PNG 做色彩量化，還不夠就縮小尺寸
- 誠實回報結果：「已達成目標」、「原圖已符合目標」或「無法達成目標（最小 X）」，不會悄悄給出超過目標的檔案
- 輸出格式：自動（有透明背景用 PNG，否則用 JPEG）、JPEG、PNG、WebP
- 非破壞式編輯：裁切、旋轉、翻轉、復原與重做，原圖不動
- 標註：箭頭、矩形、文字、編號、馬賽克（真的破壞像素）
- 對比滑桿：比較原圖與壓縮結果
- 批次處理：一次放入多張，逐張顯示結果，打包成 zip 下載
- PWA：可安裝、斷網也能用，可以從系統分享選單把圖片分享給 TinyImg
- 複製到剪貼簿（PNG）或下載
- 淺色和暗色模式、鍵盤操作、行動裝置

## 開發

需要 Node 24（見 `.nvmrc`）。

```bash
npm ci
npm run dev          # http://localhost:5173/tinyimg/
```

| 指令 | 用途 |
|---|---|
| `npm run typecheck` | TypeScript 型別檢查 |
| `npm run lint` / `npm run format:check` | ESLint、Prettier |
| `npm test` | 所有單元與整合測試 |
| `npm run test:coverage` | core 覆蓋率（門檻 90%） |
| `npm run build` / `npm run size` | 建置，並檢查首次載入 JS ≤ 200 KB（gzip） |
| `npm run e2e` | Playwright E2E：Chromium、Firefox、WebKit（第一次執行前先 `npx playwright install chromium firefox webkit`） |
| `npm run verify` | 依 CI 的順序跑完所有關卡；commit 前執行 |

開發採用 TDD 和 [Spec Kit](https://github.com/github/spec-kit) 的規格流程。規則見
[`.specify/memory/constitution.md`](.specify/memory/constitution.md)，專案背後的「為什麼」見 [`knowledge/`](knowledge/)。

## 專案結構

```text
packages/core/    圖片處理核心：壓到目標大小、量化、Worker 協定（不依賴 UI）
packages/editor/  編輯文件模型：裁切、變換、註解、復原（不依賴 UI）
packages/ui/      React 編輯器，網頁版與外掛共用
apps/web/         網頁版與 PWA（React 19 + Vite）
apps/extension/   Chrome、Edge 外掛（Manifest V3）
specs/           Spec Kit 規格、計畫與任務
knowledge/       專案知識庫（原則、願景、經驗、決策歷史）
```

## 瀏覽器外掛（Chrome、Edge）

在任何網頁按 Ctrl/Cmd+Shift+S 截圖（或框選區域、在圖片上按右鍵「用 TinyImg 編輯」），直接在側邊欄標註與壓縮。

- 開發：`npm run build -w @tinyimg/extension`，在 `chrome://extensions` 啟用開發人員模式，選「載入未封裝項目」並選擇 `apps/extension/dist`。
- 權限與用途：[`apps/extension/PERMISSIONS.md`](apps/extension/PERMISSIONS.md)。
- 發佈：推送 `vX.Y.Z` tag 後，GitHub Actions 會產生 `tinyimg-extension-X.Y.Z.zip` 並附在 Release 上；
  設定好商店憑證後也會自動上傳到 Chrome Web Store 和 Edge Add-ons（`release.yml`，設定方式見
  [`apps/extension/README.md`](apps/extension/README.md)）。

## 部署

GitHub Actions：每個 PR 都會跑完整檢查（`ci.yml`）；合併到 `main` 時自動部署到 GitHub Pages（`pages.yml`）。

## 隱私

所有處理都在瀏覽器中完成：不上傳圖片、沒有追蹤，執行時也不會載入任何遠端程式碼。
