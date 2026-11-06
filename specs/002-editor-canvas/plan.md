# Implementation Plan: 階段 1（上）：非破壞式編輯與畫布介面

**Branch**: `002-editor-canvas` | **Date**: 2026-11-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-editor-canvas/spec.md`

## Summary

在 core 新增標準化的 `EditState` 和像素精確的 `applyEdit`（裁切、D4 變換、縮放），並接到 Worker 的壓縮流程裡。
新增 `packages/editor`，負責操作、歷史和幾何推導。`apps/web` 改成以畫布為中心的介面，包含 Canvas2D 預覽、
SVG 裁切層、工具列、快捷鍵和對比滑桿。不使用畫布函式庫。決策與理由見 [research.md](research.md)。

## Technical Context

**Language/Version**: TypeScript 6.0（strict）

**Primary Dependencies**: 沿用 001；新增開發依賴 `@vitest/browser-playwright` 5.1、`vitest-browser-svelte` 3.1（元件測試）

**Storage**: N/A

**Testing**: Vitest（core 與 editor 用 Node；元件用 browser mode）、Playwright E2E（Chromium、Firefox、WebKit）

**Target Platform**: 同 001

**Project Type**: monorepo（core、editor、web）

**Performance Goals**: 12MP 圖片每次編輯後 100 ms 內更新預覽（SC-004）；編輯後 3 秒內得到新的壓縮結果（SC-007）

**Constraints**: 首次載入 JS ≤ 200 KB（gzip）；匯出在 Worker 中進行

**Scale/Scope**: editor 約 5 個模組；web 新增約 6 個元件

## Constitution Check

| 原則 | 檢查 | 結果 |
|---|---|---|
| I. 測試先行 | 測試任務排在實作之前；用屬性測試驗證 SC-002、SC-003；引入元件測試（R5）；E2E 涵蓋 SC-001、SC-005 | ✅ |
| II. 隱私優先 | 沒有網路請求，不做持久化 | ✅ |
| III. 核心與介面分離 | 像素運算放在 core（可在 Worker 執行）；文件模型放在 editor（不依賴 DOM）；非破壞式編輯 | ✅ |
| IV. UX 與無障礙 | 快捷鍵、toolbar、slider 都有正確的 ARIA 角色；暗色模式；axe 檢查；匯出不阻塞介面；200 KB 預算 | ✅ |
| V. 簡潔與漸進 | 不引入畫布函式庫；註解工具留給 003 | ✅ |

**Post-design re-check**：✅

## Project Structure

### Documentation (this feature)

```text
specs/002-editor-canvas/
├── plan.md、research.md、data-model.md、quickstart.md
├── contracts/editor-api.md、contracts/web-ui.md
└── tasks.md
```

### Source Code

```text
packages/core/src/
├── edit.ts                 # 新增：EditState、identityEdit、orientedSize、applyEdit、mapPoint
├── worker.ts               # 修改：compress 支援 edit
└── client.ts               # 修改：compress(file, req, edit?)

packages/editor/            # 新增 @tinyimg/editor
├── src/ops.ts              # Op 型別與 applyOp（Op → EditState）
├── src/document.ts         # 歷史、復原、重做、序列化
├── src/crop.ts             # 裁切框運算：比例限制、夾在範圍內、鍵盤移動
└── test/                   # 單元測試與屬性測試（含逐步套用的參考實作）

apps/web/src/
├── App.svelte              # 改為畫布式版面
└── lib/
    ├── editor.svelte.ts    # 把 EditorDocument 包成 runes 狀態，串接 workspace
    ├── shortcuts.ts        # keymap（純函式）
    ├── EditorCanvas.svelte # Canvas2D 預覽
    ├── CropOverlay.svelte  # SVG 裁切框
    ├── Toolbar.svelte
    ├── ResizeDialog.svelte
    ├── CompareSlider.svelte
    └── ShortcutHelp.svelte
apps/web/test/components/   # 元件測試（browser mode）
apps/web/e2e/editor.spec.ts # E2E
```

**Structure Decision**：依憲章建立 `packages/editor`。像素運算放在 core，讓 Worker 不必依賴 editor。

## Complexity Tracking

沒有違反憲章的項目。
