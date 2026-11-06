# Contract：外掛

## `@tinyimg/ui`

```tsx
<TinyImgApp incoming={{ file: File, key: string } | null} />
// key 改變時，等同放入新圖片；網頁版傳 null（由放入區、貼上提供圖片）
```

## 背景（`apps/extension/src/background.ts`），可測試的純函式在 `src/lib/`

```ts
buildManifest(version: string): chrome.runtime.ManifestV3           // 版本號取自 tag（去掉開頭的 v）
toCropRect(sel: RegionSelection, image: Size): Rect | null         // 小於 4 CSS px 時回傳 null
nextPending(prev: PendingImage | null, image): PendingImage        // id 遞增
needsHostPermission(src: string, extensionOrigin: string): string | null  // 回傳需要請求的 origin pattern
```

命令：`capture-visible`（建議快捷鍵 Ctrl+Shift+S、mac 為 Command+Shift+S）、`capture-region`（不指定預設按鍵）。
選單：`tinyimg-edit-image`（contexts: image）、`tinyimg-capture-region`（contexts: page）。

## 編輯器頁面（`editor.html`）

- 查詢參數 `?src=<url>`：右鍵圖片。
- 沒有參數：讀取 `pending`，並監聽之後的更新。
- 需要主機權限時，以 `role=alert` 顯示說明，並提供「允許讀取 {網站} 的圖片」按鈕。
