# Quickstart：驗證 003

| 驗證項目 | 指令 | 預期 |
|---|---|---|
| 全部關卡 | `npm run verify` | 全部通過 |
| SC-002 馬賽克 | `npm test -w @tinyimg/core`（pixelate 測試） | 方塊內單一顏色；區域外像素不變 |
| SC-003、SC-004 | `npm test -w @tinyimg/editor` | 混合序列復原與重做一致；註解跟著變換 |
| SC-001、SC-005 | `npm run e2e`（annotations.spec.ts） | 貼上 → 標註 → ⌘C；只用鍵盤；axe 零違規 |
