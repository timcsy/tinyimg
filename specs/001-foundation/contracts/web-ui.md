# Contract：網頁介面（E2E 測試依據）

E2E 測試只透過以下無障礙名稱和 `data-testid` 操作介面，不依賴樣式或 DOM 結構。

| 元素 | 定位方式 | 行為 |
|---|---|---|
| 放入區 | role=`button`，name 含「選擇或拖曳圖片」；`data-testid="dropzone"` | 點擊、Enter 或 Space 開啟檔案選擇；接受拖曳 |
| 檔案輸入 | `data-testid="file-input"` | `accept="image/*"`；選完後重設 value |
| 品質上限 | label「品質上限」，range 10–100 | 預設 80 |
| 目標大小 | label「目標大小（KB）」，number 50–10240 | 預設 1024；超出範圍時顯示 `role=alert` 的提示 |
| 輸出格式 | label「輸出格式」，select：自動、JPEG、PNG、WebP | 預設「自動」 |
| 結果狀態 | `data-testid="result-status"` | 文字為「已達成目標」「原圖已符合目標」或「無法達成目標（最小 X）」 |
| 大小資訊 | `data-testid="original-size"`、`data-testid="result-size"`、`data-testid="saving"` | `saving` 顯示「節省 X%」或「增加 X%」 |
| 複製 | role=`button`，name「複製到剪貼簿」 | 成功或失敗都以 `role=status` 的通知告知 |
| 下載 | role=`button`，name「下載」 | 檔名為「原檔名_compressed.副檔名」 |
| 錯誤 | `role=alert`，`data-testid="error"` | 錯誤訊息，對應 CompressError.message |
| 處理中 | `aria-busy="true"` 加在結果區 | 處理中不阻擋其他操作 |
| 警告 | `data-testid="warnings"` | 透明度已移除、動畫未保留 |

貼上：在頁面任何地方按 Ctrl/Cmd+V 都會處理剪貼簿中的圖片。
