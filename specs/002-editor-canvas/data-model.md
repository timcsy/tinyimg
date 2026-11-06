# Data Model：002

## EditState（`packages/core/src/edit.ts`）

由操作重播推導出來的標準化狀態。匯出順序固定為：裁切 → D4 變換 → 縮放。

| 欄位 | 型別 | 規則 |
|---|---|---|
| crop | `{ x, y, width, height }` | 原圖座標的整數；`0 ≤ x`、`x + width ≤ 原圖寬`；width、height ≥ 1 |
| rotation | `0 \| 1 \| 2 \| 3` | 順時針 90° 的次數 |
| flipX | boolean | 在旋轉之後做水平翻轉；垂直翻轉 = 旋轉 180° 加水平翻轉 |
| output | `{ width, height }` | 整數 ≥ 1，且 ≤ 變換後尺寸的 4 倍 |

衍生值：`oriented`，也就是裁切並旋轉後、縮放前的尺寸。rotation 為奇數時寬高互換。

## Op（`packages/editor/src/ops.ts`）

| type | 參數 | 說明 |
|---|---|---|
| `crop` | `x, y, width, height` | 以**目前輸出畫面**的座標表示 |
| `rotate` | `direction: 1 \| -1` | 1 為順時針 |
| `flip` | `axis: 'x' \| 'y'` | x 為水平翻轉 |
| `resize` | `width, height` | 輸出尺寸（像素） |
| `reset` | — | 回到原圖狀態 |

## EditorDocument（`packages/editor/src/document.ts`）

| 欄位 | 型別 | 說明 |
|---|---|---|
| version | `1` | 序列化格式的版本 |
| source | `{ width, height }` | 原圖尺寸（像素資料不放在文件裡） |
| ops | `Op[]` | 完整的操作歷史 |
| cursor | number | `0..ops.length`；目前生效的操作數 |

- `push(op)`：先截掉 `ops[cursor..]`，再加入 op，cursor + 1；上限 100 步，超過時把最舊的一步併入基準狀態。
- `undo()` / `redo()`：cursor −1 / +1，在範圍內移動。
- `state()`：從原圖狀態開始，依序套用 `ops[0..cursor)`，得到 EditState。
- `serialize()` / `deserialize()`：JSON 格式；內容不合法時丟出錯誤。

## 狀態轉換（介面模式）

```
viewing ──C──▶ cropping ──Enter──▶ viewing（push crop）
   ▲              └──Esc 或 ⌘Z──▶ viewing（不 push）
   └── resize 對話框：套用時 push resize，取消時不 push
```
