<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# TinyImg 專案 Copilot 指示

## 專案概述
這是一個純前端的圖片壓縮工具，使用 HTML5、CSS3 和原生 JavaScript 開發。專案目標是建立一個功能完整、使用者友善的圖片壓縮網頁應用程式。

## 開發原則

### 技術限制
- **純前端實作**：不可使用任何後端服務或 Node.js 工具
- **CDN 依賴**：只能使用 CDN 版本的第三方函式庫，目前使用 Bootstrap 5 和 Bootstrap Icons
- **原生 JavaScript**：使用 ES6+ 語法，但不依賴任何框架或構建工具
- **瀏覽器相容性**：確保主流瀏覽器支援 (Chrome 76+, Firefox 63+, Safari 13.1+, Edge 79+)

### 程式碼風格
- 使用 ES6 類別和模組化設計
- 採用語義化的變數和函式命名
- 保持程式碼結構清晰，適當添加註解
- 錯誤處理要完整，提供友善的使用者提示
- 遵循響應式設計原則

### 功能特色
- 多種圖片上傳方式：拖曳、檔案選擇、剪貼簿貼上
- 智慧壓縮演算法：漸進式壓縮直到達到目標檔案大小
- 剪貼簿整合：支援複製壓縮後的圖片到剪貼簿
- 現代化 UI：使用 Bootstrap 5 和自訂 CSS 動畫
- 即時預覽和詳細資訊顯示

## 開發指導

### 新功能開發
- 確保新功能符合純前端的限制
- 優先考慮使用者體驗和介面一致性
- 測試跨瀏覽器相容性
- 考慮效能影響，特別是處理大圖片時

### 程式碼修改
- 修改前先閱讀 AGENTS.md 了解專案狀態
- 保持現有的類別結構和命名慣例
- 新增功能時考慮與現有功能的整合
- 確保修改不會破壞現有功能

### UI/UX 考量
- 保持 Bootstrap 5 的設計語言
- 使用現有的色彩配置和動畫效果
- 確保響應式設計在各種裝置上正常運作
- 提供清楚的使用者回饋和狀態指示

### 除錯和最佳化
- 優先使用瀏覽器內建 API
- 注意記憶體管理，特別是處理 Blob 和 Object URL
- 實作適當的載入狀態和錯誤處理
- 考慮使用 Web Worker 來處理大檔案（如果需要）

## 常用 API 和技術

### 核心 API
- Canvas API：圖片繪製和壓縮
- FileReader API：讀取本地檔案
- Clipboard API：剪貼簿操作
- Drag & Drop API：拖曳上傳
- Blob API：二進位資料處理

### UI 框架
- Bootstrap 5：主要 UI 框架
- Bootstrap Icons：圖示系統
- 自訂 CSS：漸層、動畫、響應式設計

### 程式模式
- 事件驅動架構
- 防抖 (debounce) 機制
- 漸進式增強
- 錯誤邊界處理

記住：這個專案的核心價值是簡單、快速、不需要安裝或後端服務的圖片壓縮解決方案。所有的開發決策都應該圍繞這個目標進行。
