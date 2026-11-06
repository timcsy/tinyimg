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
