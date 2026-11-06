# Data Model：階段 0 地基

所有型別定義在 `packages/core/src/types.ts`，並由 `packages/core` 對外匯出。

## RawImage

解碼後的像素資料，是 core 內部唯一的圖片表示方式。

| 欄位 | 型別 | 規則 |
|---|---|---|
| width | number | 大於等於 1 的整數 |
| height | number | 大於等於 1 的整數 |
| data | Uint8ClampedArray | RGBA，長度為 width × height × 4 |

## SourceInfo（來源圖片資訊）

| 欄位 | 型別 | 說明 |
|---|---|---|
| name | string | 原始檔名。貼上的圖片沒有檔名，以 `pasted-image` 代替 |
| mimeType | string | 例如 `image/png` |
| byteSize | number | 原始位元組數 |
| width, height | number | 原始尺寸 |
| hasAlpha | boolean | 只要有任何像素的 alpha 小於 255 就是 true |
| isAnimated | boolean | 僅適用 GIF：影格數大於 1 |

## OutputFormat

`'auto' | 'jpeg' | 'png' | 'webp'`。`auto` 依 `hasAlpha` 決定：true 用 PNG，false 用 JPEG。

## CompressRequest（壓縮請求）

| 欄位 | 型別 | 規則 |
|---|---|---|
| id | number | 遞增；用來判斷是否已被新請求取代 |
| targetBytes | number | 50 × 1024 到 10240 × 1024 |
| maxQuality | number | 0.1 到 1.0（UI 以 10–100% 顯示） |
| format | OutputFormat | 預設 `auto` |

## CompressResult（壓縮結果）

| 欄位 | 型別 | 說明 |
|---|---|---|
| status | `'achieved' \| 'original-fits' \| 'unreachable'` | 見下方狀態判定 |
| bytes | Uint8Array | 輸出的編碼結果；`original-fits` 時是原始位元組 |
| mimeType | string | 輸出的實際格式 |
| width, height | number | 輸出尺寸 |
| quality | number \| null | 有損格式使用的品質；PNG 為 null |
| colors | number \| null | PNG 量化的色數；無損時為 null |
| attempts | number | 編碼嘗試次數 |
| warnings | Warning[] | `'alpha-flattened' \| 'animation-dropped'` |

### 狀態判定

- `original-fits`：原圖不超過目標，格式為 `auto` 或與原圖相同，而且重新編碼的結果不比原圖小。
- `achieved`：輸出不超過 targetBytes。
- `unreachable`：縮到最長邊 320 px 仍超過目標。這時回傳過程中最小的結果。

不變式：`status !== 'unreachable'` 時，`bytes.length <= targetBytes`。（SC-001 直接測這一條）

## CompressError

`{ code: 'not-an-image' | 'decode-failed' | 'timeout' | 'invalid-request' | 'internal', message: string }`。
`message` 用繁體中文寫給使用者看，內容要說明「發生什麼」和「可以怎麼做」。

## 狀態轉換（Web 端單一工作區）

```
idle ──放入圖片──▶ processing(id) ──結果(id = 最新)──▶ done(result)
  ▲                    │  └──新請求──▶ processing(id+1)   （舊結果丟棄）
  │                    └──錯誤或逾時──▶ error(CompressError)
  └──────── 放入新圖片或改設定 ◀──────── done / error
```
