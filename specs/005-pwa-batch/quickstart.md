# Quickstart：驗證 005

| 驗證項目 | 指令 | 預期 |
|---|---|---|
| 全部關卡 | `npm run verify` | 全部通過 |
| zip、批次、SW 路由 | `npm test` | 純函式測試通過 |
| 離線、分享、批次 | `npm run e2e -w @tinyimg/web`（pwa.spec、batch.spec） | 通過 |
