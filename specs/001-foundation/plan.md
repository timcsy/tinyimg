# Implementation Plan: 階段 0：地基（可靠的壓縮核心與對等網頁版）

**Branch**: `001-foundation` | **Date**: 2026-11-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-foundation/spec.md`

## Summary

把舊版單頁工具重構成 npm workspaces monorepo。`packages/core` 是純 TypeScript 的壓縮核心，
編碼器以注入方式提供：有損格式對品質二分搜尋，PNG 做色彩量化，兩者都壓不下來時縮小尺寸，
結果明確區分「已達成」「原圖已符合目標」「無法達成」。核心透過單一 Web Worker 執行，
支援協作式取消和 30 秒逾時。`apps/web` 用 Svelte 5 做一個功能和舊版對等的最小介面。
GitHub Actions 負責 CI 與部署 Pages。技術決策見 [research.md](research.md)。

## Technical Context

**Language/Version**: TypeScript 6.0（strict），Node 24（工具鏈與 CI）

**Primary Dependencies**: Vite 8、Svelte 5、`@jsquash/oxipng`、`@jsquash/jpeg`、`@jsquash/webp`（WASM，延遲載入）、`image-q`

**Storage**: N/A（純本機處理，不做任何持久化）

**Testing**: Vitest 5 + `@vitest/coverage-v8`（core，Node 環境）、Playwright 1.65 + `@axe-core/playwright`（E2E）

**Target Platform**: Chrome、Edge、Firefox、Safari 的最近兩個主要版本；部署在 GitHub Pages

**Project Type**: monorepo（函式庫 `packages/core` 加網頁應用 `apps/web`）

**Performance Goals**: 12MP 照片 3 秒內完成（SC-003）；主執行緒沒有超過 200 ms 的長任務（SC-004）

**Constraints**: 首次載入 JS（gzip）≤ 200 KB；執行期不載入遠端程式碼；30 秒逾時

**Scale/Scope**: 單一頁面、約 6 個 UI 元件、core 約 10 個模組

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| 原則 | 檢查 | 結果 |
|---|---|---|
| I. 測試先行 | tasks 中每個實作任務前都有失敗測試任務；core 覆蓋率門檻 90% 寫進 CI；E2E 涵蓋主要流程；測試圖片以固定種子產生 | ✅ |
| II. 隱私優先 | 沒有網路請求；WASM 隨套件打包、延遲載入，不從 CDN 取得；沒有任何追蹤 | ✅ |
| III. 核心與介面分離 | core 不依賴 DOM 或 UI 框架，編碼器以介面注入，可在 Worker 執行；跨套件介面有契約測試（contracts/core-api.md） | ✅ |
| IV. UX 與無障礙 | 暗色模式、鍵盤操作、axe 檢查、Worker 不阻塞、200 KB 預算、可行動的錯誤訊息、「無法達成」明確顯示 | ✅ |
| V. 簡潔與漸進 | 只做和舊版對等的功能加上可靠核心；新增的相依套件都在 research 說明理由與替代方案 | ✅ |
| 技術與平台約束 | TS strict、Vite、npm workspaces、lockfile、Actions 發佈 | ✅ |

**Post-design re-check**：Phase 1 的設計（data-model、contracts）沒有引入違規。✅

## Project Structure

### Documentation (this feature)

```text
specs/001-foundation/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── core-api.md
│   └── web-ui.md
└── tasks.md             # /speckit-tasks 產出
```

### Source Code (repository root)

```text
package.json                 # workspaces、共用 scripts
tsconfig.base.json
eslint.config.js
.prettierrc
scripts/check-size.mjs       # bundle 預算檢查
.github/workflows/
├── ci.yml
└── pages.yml

packages/core/
├── package.json             # @tinyimg/core；exports: ".", "./worker", "./client"
├── src/
│   ├── types.ts
│   ├── analyze.ts           # hasAlpha、flattenAlpha、isAnimatedGif
│   ├── format.ts            # resolveFormat
│   ├── resize.ts            # boxResize、nextScale
│   ├── validate.ts          # validateRequest
│   ├── search.ts            # 品質二分搜尋
│   ├── compress.ts          # compressToTarget
│   ├── codecs/
│   │   ├── browser.ts       # 原生 OffscreenCanvas 加 WASM 補位
│   │   └── wasm.ts          # jsquash、image-q 的延遲載入包裝
│   ├── worker.ts            # 訊息協定處理（worker 端）
│   ├── client.ts            # createCompressor（主執行緒端）
│   └── index.ts
└── test/
    ├── fixtures/generate.ts
    ├── *.test.ts            # 單元與契約測試（假的編碼器）
    └── *.integration.test.ts  # 真實 WASM 編碼器

apps/web/
├── package.json             # @tinyimg/web
├── vite.config.ts           # base: '/tinyimg/'
├── index.html
├── src/
│   ├── main.ts
│   ├── App.svelte
│   ├── lib/
│   │   ├── DropZone.svelte
│   │   ├── Settings.svelte
│   │   ├── Comparison.svelte
│   │   ├── Actions.svelte
│   │   ├── Toast.svelte
│   │   ├── store.svelte.ts  # 工作區狀態機（data-model 的狀態轉換）
│   │   ├── format.ts        # 檔案大小、節省比例的格式化
│   │   └── strings.ts       # 介面文字集中管理（憲章 IV）
│   └── app.css              # 設計 token、暗色模式
└── e2e/
    ├── fixtures/            # 由 core 的產生器輸出的小型測試圖片
    └── *.spec.ts

（舊版 index.html、script.js、styles.css 會在 US2 完成後移除）
```

**Structure Decision**: 採用憲章規定的 monorepo，但階段 0 只建 `packages/core` 和 `apps/web`。
`packages/editor` 和 `apps/extension` 等到階段 1、2 有需求時才建立（原則 V，YAGNI）。

## Complexity Tracking

沒有違反憲章的項目。
