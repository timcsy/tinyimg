# Contract：註解介面

## `@tinyimg/core`

```ts
pixelate(img: RawImage, rect: Rect, block: number): RawImage        // 不修改輸入；區域外的像素不變
mosaicBlock(rect: Rect): number                                      // max(12, ceil(短邊 / 20))
renderAnnotations(ctx: Ctx2D, list: Annotation[]): void              // 不畫 mosaic（由 pixelate 處理）
applyAnnotations(img, list, draw?: (img, vectors) => Promise<RawImage>): Promise<RawImage>
// = 先對所有 mosaic 執行 pixelate，再呼叫 draw 畫上其他註解（瀏覽器用 OffscreenCanvas；沒有 draw 就略過）
```

Worker：`compress` 訊息新增選填的 `annotations?: Annotation[]`。流程為解碼 → `applyAnnotations` → `applyEdit` → 壓縮；
有註解時 `allowOriginal = false`。

## `@tinyimg/editor`

```ts
documentState(doc): { edit: EditState; annotations: Annotation[] }
stepNumber(list, id): number
hitTest(list, p: Point, tolerance: number): string | null           // 最上層命中的註解 id
```
