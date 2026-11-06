# Contract：畫布介面（E2E 與元件測試依據）

沿用 001 的 [web-ui 合約](../../001-foundation/contracts/web-ui.md)：放入區、設定、結果狀態、大小資訊、錯誤、警告的定位方式都不變。

新增或變更的部分：

| 元素 | 定位方式 | 行為 |
|---|---|---|
| 畫布區 | `role=region`，name「編輯畫布」；`data-testid="canvas"` | 可聚焦，快捷鍵在這裡生效 |
| 工具列 | `role=toolbar`，name「編輯工具」 | 左右方向鍵在按鈕之間移動焦點 |
| 工具按鈕 | role=button，name 依序為「裁切」「逆時針旋轉」「順時針旋轉」「水平翻轉」「垂直翻轉」「調整尺寸」「復原」「重做」「全部還原」 | 無法使用時為 `disabled` |
| 裁切框 | `data-testid="crop-box"`；八個控制點 role=slider 或 button，name 例如「左上控制點」 | 拖曳；鍵盤操作見 spec FR-008 |
| 裁切比例 | label「裁切比例」，select | 選項：自由、原始、1:1、4:3、3:2、16:9 |
| 套用或取消裁切 | button「套用裁切」「取消」 | 對應 Enter、Esc |
| 輸出尺寸 | `data-testid="output-size"` | 例如「300 × 400」 |
| 調整尺寸對話框 | `role=dialog`，name「調整尺寸」；欄位「寬度」「高度」「維持比例」 | 不合法時顯示 `role=alert` |
| 對比滑桿 | role=slider，name「前後對比」，`aria-valuetext` 例如「50%」 | 左右方向鍵每次 5%；Home 為 0%，End 為 100% |
| 快捷鍵說明 | `role=dialog`，name「快捷鍵」 | 按 ? 開啟，Esc 關閉 |

001 的「原圖、壓縮後並排比較」改成畫布加上對比滑桿；`result-status`、`result-size`、`saving`、`warnings` 仍保留在結果資訊列。
