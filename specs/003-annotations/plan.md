# Implementation Plan: 階段 1（下）：註解工具

**Branch**: `003-annotations` | **Date**: 2026-11-06 | **Spec**: [spec.md](spec.md)

## Summary

註解以原圖座標存成資料，與 002 的編輯共用同一條歷史。匯出時 Worker 依序執行：馬賽克（純像素破壞）→ 向量註解
（`renderAnnotations`）→ `applyEdit` → 壓縮。預覽與匯出共用同一個算繪器；互動層是 SVG 命中區加上無障礙標籤。
見 [research.md](research.md)。

## Technical Context

**Language/Version**: TypeScript 6.0、React 19（沿用 002）

**Primary Dependencies**: 不新增相依套件

**Testing**: Vitest（core 與 editor 用 Node；元件用 browser mode）、Playwright E2E（三種瀏覽器）

**Performance Goals**: 200 個註解時拖曳更新 ≤ 50 ms（SC-006）

**Constraints**: 首次載入 JS ≤ 200 KB；匯出在 Worker 中進行

## Constitution Check

| 原則 | 檢查 | 結果 |
|---|---|---|
| I. 測試先行 | pixelate 用像素層級測試；renderAnnotations 用假 context；混合序列的屬性測試；E2E；注入錯誤檢查 | ✅ |
| II. 隱私優先 | 馬賽克真的破壞像素，並以測試證明 | ✅ |
| III. 核心與介面分離 | 算繪與像素運算放在 core（Worker 可用），模型放在 editor；非破壞式 | ✅ |
| IV. UX 與無障礙 | 快捷鍵、鍵盤建立與移動、每個註解有可讀名稱、axe；200 KB | ✅ |
| V. 簡潔 | 不新增相依套件，不做圖層面板 | ✅ |

## Project Structure

```text
packages/core/src/annotations.ts   # Annotation 型別、pixelate、mosaicBlock、renderAnnotations、applyAnnotations
packages/core/src/worker.ts        # compress 支援 annotations
packages/core/src/codecs/browser.ts# drawVectors（OffscreenCanvas）
packages/editor/src/ops.ts         # 註解 Op
packages/editor/src/document.ts    # documentState（edit 與 annotations）
packages/editor/src/annotate.ts    # stepNumber、hitTest、moveAnnotation、預設幾何
apps/web/src/lib/AnnotationLayer.tsx  # SVG 手勢、命中區、選取外框、文字輸入
apps/web/src/lib/AnnotationBar.tsx    # 工具、顏色、粗細
apps/web/src/lib/EditorCanvas.tsx     # 加上註解與馬賽克預覽
apps/web/e2e/annotations.spec.ts
```

## Complexity Tracking

沒有違反憲章的項目。
