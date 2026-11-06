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

## 實際驗證結果（2026-11-06，本機 macOS，load average 約 40–80）

| 項目 | 結果 |
|---|---|
| core | 133 個測試通過；覆蓋率 97.67% / 92.67% / 98.18% / 99.25% |
| editor | 37 個測試通過；覆蓋率 100% / 98.75% / 100% / 100%（含 200 組隨機序列的屬性測試，注入兩種錯誤都能抓到） |
| web 單元測試、元件測試 | 53 個、15 個通過（元件測試在真實的 Chromium 執行） |
| 首次載入 JS | 76.1 KB（gzip，React 19）／預算 200 KB |
| E2E | 一般 96 個 + 依序 9 個通過（Chromium、Firefox、WebKit） |
| SC-001（2 個操作完成複製） | 三種瀏覽器通過 |
| SC-002、SC-003（屬性測試） | 通過 |
| SC-004（預覽更新 ≤ 100 ms） | 3–68 ms |
| SC-005（只用鍵盤、axe 零違規） | 三種瀏覽器通過（淺色、暗色） |
| SC-006（≤ 200 KB） | 76.1 KB |
| SC-007（編輯後新結果） | Chromium 1.4–2.0 秒；Firefox 3.4–5.6 秒；WebKit 2.0–2.4 秒 |

注意：
- 第一次完整跑時，Firefox 的 SC-007 在高負載下失敗一次（5.57 秒，暫定上限 5 秒），重跑依序執行的那組時 9 個都通過。
- Firefox、WebKit 是否以 3 秒驗收，待使用者決定：`knowledge/draft/2026-11-06-SC-003在Firefox與WebKit的預算.md`。
