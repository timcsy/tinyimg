# Implementation Plan: 階段 2：瀏覽器外掛

**Branch**: `004-browser-extension` | **Date**: 2026-11-06 | **Spec**: [spec.md](spec.md)

## Summary

先把編輯器 UI 抽成 `packages/ui`（網頁版的 E2E 不修改即可通過），再新增 `apps/extension`：MV3 service worker
負責截圖、框選、右鍵選單；用 `storage.session` 交接最新的一張圖片；編輯器頁面（側邊欄或新分頁）使用 `<TinyImgApp>`。
跨網域圖片的主機權限是 optional，在編輯器頁面由使用者點按鈕授權。打 tag 時，`release.yml` 打包並建立 Release。
見 [research.md](research.md)。

## Technical Context

**Language/Version**: TypeScript 6.0、React 19

**Primary Dependencies**: 不新增執行期相依；開發依賴 `@types/chrome`

**Testing**: Vitest（純函式）、Playwright（`--load-extension`，只支援 Chromium）

**Constraints**: MV3、不載入遠端程式碼、必要權限不超過 5 項

## Constitution Check

| 原則 | 檢查 | 結果 |
|---|---|---|
| I. 測試先行 | 純函式先寫測試；外掛 E2E；網頁版 E2E 作為抽出後的回歸測試 | ✅ |
| II. 隱私優先 | 5 項必要權限各有用途；主機權限 optional 並逐一請求；`storage.session` 不寫入磁碟；遠端程式碼掃描 | ✅ |
| III. 核心與介面分離 | 建立 `packages/ui`；外掛和網頁版都只是殼 | ✅ |
| IV. UX 與無障礙 | 外掛頁面跑同一套 axe 檢查；側邊欄使用窄版面 | ✅ |
| V. 簡潔 | 不引入外掛建置框架；只做 Chrome 和 Edge | ✅ |

## Project Structure

```text
packages/ui/            # @tinyimg/ui：App（TinyImgApp）、lib/*、app.css、單元測試與元件測試（從 apps/web 搬過來）
apps/web/               # 只剩 main.tsx、index.html、E2E
apps/extension/
├── manifest.config.ts  # buildManifest（版本取自 tag）
├── vite.config.ts      # editor.html + background（ES）；overlay（IIFE，另一次建置）
├── src/background.ts   # 命令、選單、截圖、裁切、交接
├── src/overlay.ts      # 框選遮罩（內容腳本）
├── src/editor/         # editor.html、main.tsx（讀取 pending 或 src，請求權限）
├── src/lib/            # 純函式：manifest、crop、pending、permissions
├── scripts/package.mjs # 打包 zip、掃描遠端程式碼
├── test/               # Vitest
├── e2e/                # Playwright（載入外掛）
└── PERMISSIONS.md      # 權限用途說明
.github/workflows/release.yml
```

## Complexity Tracking

沒有違反憲章的項目。
