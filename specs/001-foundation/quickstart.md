# Quickstart：驗證階段 0

## 前置需求
- Node 24（`node --version` 應 ≥ 22.12），npm 11
- 第一次跑 E2E 前，先執行 `npx playwright install chromium`

## 安裝與開發
```bash
npm ci
npm run dev        # 啟動 apps/web，開啟 http://localhost:5173/tinyimg/
```

## 驗證情境

| 驗證項目 | 指令 | 預期結果 |
|---|---|---|
| 型別、lint、格式 | `npm run typecheck && npm run lint && npm run format:check` | 全部通過 |
| core 單元與整合測試、覆蓋率 | `npm run test:coverage -w @tinyimg/core` | 全部通過；四項覆蓋率都 ≥ 90% |
| SC-001 不會靜默超標 | 同上，`compress.integration.test.ts` | 所有測試圖片都是 `achieved`，或標示為 `unreachable` |
| SC-002 PNG 截圖達成目標 | 同上，`png.integration.test.ts` | 截圖類測試圖片至少 90% 為 `achieved` |
| 建置與 bundle 預算 | `npm run build && npm run size` | 首次載入 JS（gzip）≤ 200 KB |
| E2E（SC-005、SC-006） | `npm run e2e` | 拖曳、選檔、貼上、複製、下載、錯誤訊息、無障礙全部通過 |

## 手動抽查（選做）
1. 拖入一張大型 PNG 截圖，目標 1024 KB，格式「自動」，應顯示「已達成目標」。
2. 把目標改成 50 KB，應顯示「無法達成目標（最小 …）」，仍可以下載。
3. 拖入一個 `.txt` 檔，應立即出現錯誤訊息。
4. 系統切換成暗色模式，頁面應跟著改變。

## 發佈
- 開 PR 會觸發 `ci.yml`；合併到 `main` 會觸發 `pages.yml`，部署到 `https://timcsy.github.io/tinyimg/`。

## 實際驗證結果（2026-11-06，本機 macOS、Node 24.20）

本機依 `ci.yml` 的順序完整模擬（`npm ci` → lint → format → typecheck → coverage → test → build → size → e2e）：

| 項目 | 結果 |
|---|---|
| lint、format、typecheck | 通過（svelte-check 0 錯誤、0 警告） |
| core 測試 | 106 個通過；覆蓋率 statements 97.89%、branches 91.16%、functions 97.91%、lines 99.37% |
| SC-001、SC-002 | 整合測試通過；10 張截圖至少 9 張達成，且多數需要量化或縮尺寸（測試具鑑別力） |
| web 單元測試、size 腳本測試 | 20 個、5 個通過 |
| 首次載入 JS | 19.7 KB（gzip）／預算 200 KB |
| E2E | 63 個通過（Chromium、Firefox、WebKit；其中 6 個 `@serial` 以單一 worker 執行） |
| SC-003（12MP 照片 ≤ 3 秒） | Chromium 2.06 秒、Firefox 2.15 秒、WebKit 2.43 秒 |
| SC-004（無 > 200 ms 長任務） | Chromium 0 個；Firefox、WebKit 不支援 longtask API，無法量測 |

尚未驗證：GitHub 上實際執行 CI 與 Pages 部署（需要 push，見 `knowledge/draft/2026-11-06-對外發佈需要使用者確認.md`）；
actionlint；SC-004 在 Firefox、WebKit 上的量測。
