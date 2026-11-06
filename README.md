# TinyImg

在你的裝置上把圖片壓到目標大小，然後一鍵複製或下載。圖片不會上傳到任何地方。

> 專案正在重構：目前是**階段 0（地基）**。接下來的階段會加入畫布編輯器、標註工具和瀏覽器外掛，
> 路線圖見 [`knowledge/vision.md`](knowledge/vision.md)。

## 功能

- 拖曳、選擇檔案或直接貼上（Ctrl/Cmd + V）放入圖片
- 自動壓到目標大小（預設 1 MB）：有損格式調整品質，PNG 做色彩量化，還不夠就縮小尺寸
- 誠實回報結果：「已達成目標」、「原圖已符合目標」或「無法達成目標（最小 X）」，不會悄悄給出超過目標的檔案
- 輸出格式：自動（有透明背景用 PNG，否則用 JPEG）、JPEG、PNG、WebP
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
| `npm run typecheck` | TypeScript 與 svelte-check |
| `npm run lint` / `npm run format:check` | ESLint、Prettier |
| `npm test` | 所有單元與整合測試 |
| `npm run test:coverage` | core 覆蓋率（門檻 90%） |
| `npm run build` / `npm run size` | 建置，並檢查首次載入 JS ≤ 200 KB（gzip） |
| `npm run e2e` | Playwright E2E（第一次執行前先 `npx playwright install chromium`） |

開發採用 TDD 和 [Spec Kit](https://github.com/github/spec-kit) 的規格流程。規則見
[`.specify/memory/constitution.md`](.specify/memory/constitution.md)，專案背後的「為什麼」見 [`knowledge/`](knowledge/)。

## 專案結構

```text
packages/core/   圖片處理核心：壓到目標大小、量化、Worker 協定（不依賴 UI）
apps/web/        網頁版（Svelte 5 + Vite）
specs/           Spec Kit 規格、計畫與任務
knowledge/       專案知識庫（原則、願景、經驗、決策歷史）
```

## 部署

GitHub Actions：每個 PR 都會跑完整檢查（`ci.yml`）；合併到 `main` 時自動部署到 GitHub Pages（`pages.yml`）。

## 隱私

所有處理都在瀏覽器中完成：不上傳圖片、沒有追蹤，執行時也不會載入任何遠端程式碼。
