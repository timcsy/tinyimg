# Contract：編輯核心介面

## `@tinyimg/core`（新增）

```ts
interface EditState { crop: Rect; rotation: 0 | 1 | 2 | 3; flipX: boolean; output: Size }
identityEdit(source: Size): EditState
orientedSize(state: EditState): Size
applyEdit(img: RawImage, state: EditState, resize?: (img, w, h) => Promise<RawImage>): Promise<RawImage>
mapPoint(state: EditState, p: Point): Point       // 輸出座標 → 原圖座標（預覽、測試用）
```

保證：
- 沒有縮放時（`output` 等於 `orientedSize`），`applyEdit` 的結果與「逐步在像素上做裁切、旋轉、翻轉」逐像素相同。
- 不修改輸入的 `img`。

Worker 協定：`compress` 訊息新增選填的 `edit?: EditState`。有提供時，解碼後先 `applyEdit` 再壓縮；
`SourceInfo` 仍描述原始檔案，`CompressResult` 的尺寸則是編輯後的尺寸。

## `@tinyimg/editor`

```ts
type Op = { type: 'crop'; x; y; width; height } | { type: 'rotate'; direction: 1 | -1 }
        | { type: 'flip'; axis: 'x' | 'y' } | { type: 'resize'; width; height } | { type: 'reset' }

applyOp(state: EditState, op: Op, source: Size): EditState     // 純函式
createDocument(source: Size): EditorDocument
doc.push(op) / doc.undo() / doc.redo() / doc.canUndo / doc.canRedo / doc.state()
serialize(doc): string / deserialize(json: string): EditorDocument
```

保證（以屬性測試驗證）：
- 任意操作序列：`applyEdit(img, state)` 與參考實作（逐步在像素上套用每個操作）逐像素相同（不含縮放的序列）。
- 連續旋轉 4 次，或對同一軸翻轉 2 次，結果等於原本的狀態。
- `undo` 到底等於原圖狀態；`redo` 到底等於最終狀態。
- `deserialize(serialize(doc))` 的 `state()` 與原文件相同。
