# Quickstart：驗證 002

前置需求與安裝同 [001 quickstart](../001-foundation/quickstart.md)。

| 驗證項目 | 指令 | 預期結果 |
|---|---|---|
| 全部關卡 | `npm run verify` | 全部通過 |
| SC-002、SC-003（屬性測試） | `npm test -w @tinyimg/editor` | 隨機操作序列與參考實作逐像素相同；復原、重做後完全一致 |
| 元件測試 | `npm run test:components -w @tinyimg/web` | CropOverlay、Toolbar、CompareSlider 的互動測試通過 |
| SC-001、SC-005 | `npm run e2e` 中的 `editor.spec.ts` | 兩個操作就能複製；只用鍵盤可完成整個流程；axe 零違規 |
| SC-004、SC-007 | `npm run e2e` 中的 `@perf` 測試 | 12MP：預覽 ≤ 100 ms；新結果 ≤ 3 秒 |

## 手動抽查
1. 貼上一張截圖，直接按 ⌘C，再貼到其他應用程式，應該得到圖片。
2. 按 C 進入裁切，選 1:1，拖曳角落，按 Enter；按 R 兩次；按 ⌘Z 三次，應該回到原圖。
3. 拖動對比滑桿，比較壓縮前後的畫質。
