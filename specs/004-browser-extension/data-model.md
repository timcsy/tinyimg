# Data Model：004

## PendingImage（`chrome.storage.session` 的 `pending` 欄位）

| 欄位 | 型別 | 說明 |
|---|---|---|
| id | number | 遞增；編輯器只處理比上一張大的 id |
| dataUrl | string | 圖片資料（PNG；超過配額時改用 JPEG） |
| source | `'visible' \| 'region' \| 'context-image'` | 來源 |
| name | string | 下載檔名的基礎，例如 `screenshot-2026-11-06` |

## ExtensionSettings（`chrome.storage.local` 的 `settings` 欄位）

| 欄位 | 型別 | 預設 |
|---|---|---|
| openIn | `'sidepanel' \| 'tab'` | `'sidepanel'` |

## RegionSelection（框選遮罩回傳）

`{ x, y, width, height }`（CSS 像素）加上 `dpr`。裁切範圍 = 各值乘以 dpr 後取整數，並夾在截圖範圍內；
寬或高小於 4 個 CSS 像素時視為取消。
