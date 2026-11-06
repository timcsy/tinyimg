# Quickstart：驗證 004

| 驗證項目 | 指令 | 預期 |
|---|---|---|
| 全部關卡 | `npm run verify` | 全部通過（含外掛建置、遠端程式碼掃描、外掛 E2E） |
| SC-003 | `npm run e2e -w @tinyimg/web` | 網頁版既有 E2E 不經修改全部通過 |
| 外掛 E2E | `npm run e2e -w @tinyimg/extension` | 截圖、框選、右鍵圖片、側邊欄、無障礙 |
| 套件 | `npm run package -w @tinyimg/extension -- 0.2.0` | 產生 `tinyimg-extension-0.2.0.zip`，manifest 版本為 0.2.0 |

## 手動安裝
1. `npm run build -w @tinyimg/extension`
2. 在 Chrome 開啟 `chrome://extensions`，啟用開發人員模式，選「載入未封裝項目」，選擇 `apps/extension/dist`。

## 實際驗證結果（2026-11-06，本機 macOS，load average 約 50–100）

| 項目 | 結果 |
|---|---|
| 外掛單元測試、打包腳本測試 | 22 個、4 個通過 |
| 外掛 E2E（Chromium） | 8 個通過：可見區域截圖 401 ms（SC-001 ≤ 2 秒）、框選、Esc 取消、截圖 → 箭頭 → 複製（SC-002）、無法截圖的頁面、右鍵同網域與跨網域圖片、讀不到的圖片、axe（SC-007） |
| SC-003（網頁版 E2E 不修改） | 108 個通過 |
| SC-004（必要權限 ≤ 5、主機權限只在 optional） | `buildManifest` 單元測試通過；`PERMISSIONS.md` |
| SC-005、SC-006（無遠端程式碼、版本一致） | 打包腳本測試通過 |
| 未自動化 | 側邊欄模式、網站權限請求的按鈕流程、`release.yml` 在 GitHub 上的實際執行（需要 push） |
| 網頁版效能 | 一輪中 Firefox SC-004 為 127 ms（load 92–101，之前 22–68 ms），記錄在 Firefox 預算 draft |
