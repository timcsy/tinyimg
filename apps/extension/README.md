# TinyImg 外掛（Chrome、Edge）

在任何網頁按 Ctrl/Cmd+Shift+S 截圖（或框選區域、在圖片上按右鍵「用 TinyImg 編輯」），直接在側邊欄標註與壓縮。
權限與用途見 [`PERMISSIONS.md`](PERMISSIONS.md)。

## 自己安裝

- 從原始碼：`npm run build -w @tinyimg/extension`，在 `chrome://extensions`（或 `edge://extensions`）啟用開發人員模式，
  選「載入未封裝項目」並選擇 `apps/extension/dist`。
- 從 Release：下載 `tinyimg-extension-X.Y.Z.zip`、解壓縮，再用同樣的方式載入。

## 發佈

推送 `vX.Y.Z` tag 後，`release.yml` 會：

1. 以 tag 的版本號建置外掛、掃描遠端程式碼並打包成 zip（`scripts/package.mjs`）。
2. 建立 GitHub Release 並附上 zip。
3. 執行 `scripts/store.mjs` 上傳到商店。**沒有設定任何商店憑證時會略過**；只設定了某家商店的一部分憑證時會失敗，
   並列出缺少的變數名稱（不會印出任何值）。

### 自動上架商店的設定

第一次上架必須在商店後台手動完成（商店頁面文案、截圖、隱私說明可以引用 `PERMISSIONS.md`）。之後在 repo 的
Settings → Secrets and variables → Actions 加入下列 secrets：

| Secret | 來源 |
|---|---|
| `CWS_CLIENT_ID`、`CWS_CLIENT_SECRET` | Google Cloud 專案的 OAuth 用戶端（啟用 Chrome Web Store API） |
| `CWS_REFRESH_TOKEN` | 用上面的用戶端、以 `https://www.googleapis.com/auth/chromewebstore` scope 授權後取得 |
| `CWS_PUBLISHER_ID` | Chrome Web Store 開發人員資訊主頁 → Publisher → Settings |
| `CWS_EXTENSION_ID` | 已上架項目的 ID |
| `EDGE_CLIENT_ID`、`EDGE_API_KEY` | Partner Center → Microsoft Edge → Publish API（v1.1，API key 有到期日） |
| `EDGE_PRODUCT_ID` | Partner Center 的 Extension overview 頁面上的 Product ID |

- 預設只上傳成**草稿**，不送審。要在推 tag 時直接送審，加入 repository variable `STORE_PUBLISH`，值設為 `1`。
- 每次上傳的版本號必須比商店上的版本高（版本號來自 tag）。
- 使用的 API：Chrome Web Store API v2、Edge Add-ons API v1.1。腳本只用 Node 內建的 `fetch`，沒有額外的相依套件。
