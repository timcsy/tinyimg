# Contract：`@tinyimg/core` 公開介面

型別見 [data-model.md](../data-model.md)。這裡定義的每個函式都必須有契約測試（憲章 III）。

## 純函式（可在任何環境執行）

```ts
resolveFormat(format: OutputFormat, hasAlpha: boolean): 'jpeg' | 'png' | 'webp'
hasAlpha(img: RawImage): boolean
flattenAlpha(img: RawImage, background?: [r, g, b]): RawImage      // 預設白底
isAnimatedGif(bytes: Uint8Array): boolean
boxResize(img: RawImage, width: number, height: number): RawImage
nextScale(currentBytes: number, targetBytes: number): number        // 介於 0.5 和 0.9 之間
validateRequest(req: unknown): CompressRequest | CompressError      // code 為 'invalid-request'
```

## 壓縮演算法（編碼器以參數注入）

```ts
interface Codecs {
  encode(img: RawImage, format: 'jpeg' | 'webp', quality: number): Promise<Uint8Array>
  encodePng(img: RawImage, colors: number | null): Promise<Uint8Array>   // null 代表無損
  resize?(img: RawImage, width: number, height: number): Promise<RawImage>  // 沒提供就用 boxResize
}

compressToTarget(
  img: RawImage,
  source: SourceInfo & { bytes: Uint8Array },
  req: CompressRequest,
  codecs: Codecs,
  opts?: { isCancelled?: () => boolean; minEdge?: number /* 預設 320 */ }
): Promise<CompressResult>   // isCancelled() 為 true 時 reject，錯誤名稱為 'CancelledError'
```

保證：
- 當 `status !== 'unreachable'` 時，`result.bytes.length <= req.targetBytes`。
- 有損格式的最終品質在 `[0.3, req.maxQuality]` 範圍內；`attempts` 不超過 `(1 + 6) × 縮放輪數`。
- 只會呼叫 `codecs`，不會碰 DOM 或網路。

## Worker 訊息協定（`@tinyimg/core/worker`）

主執行緒傳給 worker：

```ts
{ type: 'compress', id: number, file: { name, mimeType, bytes: ArrayBuffer }, request: CompressRequest }
{ type: 'to-png', id: number, bytes: ArrayBuffer, mimeType: string }
```

worker 回傳給主執行緒：

```ts
{ type: 'result', id, source: SourceInfo, result: CompressResult }
{ type: 'png', id, bytes: ArrayBuffer }
{ type: 'error', id, error: CompressError }
// 被新請求取代的工作不回傳任何訊息
```

用戶端包裝（`createCompressor()`）：

```ts
const c = createCompressor({ timeoutMs: 30_000 })
c.compress(file: File | Blob, req): Promise<{ source, result } | { superseded: true }>
c.toPng(bytes, mimeType): Promise<Uint8Array>
c.dispose(): void
```

- 呼叫 `compress` 時，先前尚未完成的 promise 會 resolve 成 `{ superseded: true }`。
- 逾時會 reject，錯誤碼為 `timeout`，並重建 worker。
