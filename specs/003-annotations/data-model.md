# Data Model：003

## Annotation（`packages/core/src/annotations.ts`）

所有座標和長度都以**原圖像素**為單位。

| 欄位 | 型別 | 說明 |
|---|---|---|
| id | string | 穩定識別碼 |
| kind | `'pen' \| 'highlighter' \| 'arrow' \| 'rect' \| 'ellipse' \| 'text' \| 'step' \| 'mosaic'` | |
| points | `Point[]` | pen 和 highlighter 是點列；arrow 是 [起點, 終點]；rect、ellipse、mosaic 是 [一角, 對角]；text 和 step 是 [位置] |
| color | string | `#rrggbb`，預設 8 色之一 |
| width | number | 線寬；text 和 step 用來決定字級 |
| text | string？ | 只有 text 有 |

衍生值：編號標記的號碼 = 它在所有 step 註解中的順序（從 1 開始）。

## 新增的 Op（`packages/editor/src/ops.ts`）

| type | 參數 |
|---|---|
| `annotate-add` | `annotation` |
| `annotate-update` | `id`, `patch`（points、color、width、text 的部分欄位） |
| `annotate-remove` | `id` |

文件狀態：`{ edit: EditState, annotations: Annotation[] }`，由重播推導。`reset` 只重設 `edit`。
