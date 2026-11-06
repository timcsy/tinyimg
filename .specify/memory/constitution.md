# TinyImg Constitution

## Core Principles

### I. 測試先行（TDD，不可妥協）

- 所有產品程式碼 MUST 遵循 Red → Green → Refactor 循環：先寫出會失敗的測試，
  確認失敗原因正確，再寫最少量的實作讓測試通過，最後在測試保護下重構。
- 沒有對應失敗測試的產品程式碼 MUST NOT 被合併；修正 bug 時 MUST 先新增能重現該 bug 的測試。
- `tasks.md` 中每個功能的測試任務 MUST 排在其實作任務之前。
- 測試分層：
  - **單元測試**（Vitest）：`core` 套件的純邏輯（壓縮演算法、尺寸計算、格式轉換、編輯指令、
    復原/重做）MUST 有單元測試，行覆蓋率 MUST ≥ 90%。
  - **元件測試**：編輯器 UI 元件的互動行為 MUST 有測試（以使用者可觀察的行為為準，不測實作細節）。
  - **端對端測試**（Playwright）：每個使用者故事的主要流程（上傳 → 編輯 → 壓縮 → 複製/下載）
    MUST 至少有一條 E2E 測試；外掛的截圖與右鍵選單流程亦同。
- 測試 MUST 具確定性：不得依賴網路、真實時間或執行順序；圖片測試使用 repo 內固定的測試素材。

**理由**：壓縮與編輯涉及大量邊界情況（透明度、格式、尺寸、瀏覽器差異），舊版的多個缺陷
（PNG 品質參數無效、Promise 永不 resolve、競態條件）都是缺乏測試所致。

### II. 隱私優先：純本機處理

- 使用者的圖片與編輯內容 MUST 只在使用者的裝置上處理，MUST NOT 上傳到任何伺服器。
- 產品 MUST NOT 包含追蹤、分析或第三方遙測，除非憲章修訂明確允許且為使用者可選擇加入（opt-in）。
- 執行期 MUST NOT 載入遠端程式碼（CDN 腳本、遠端 WASM 等）；所有相依套件 MUST 於建置時打包。
  此要求同時滿足瀏覽器外掛 Manifest V3 的規範。
- 外掛 MUST 只申請完成功能所需的最小權限，每個權限的用途 MUST 記錄於文件。

**理由**：截圖與圖片常含敏感資訊；「完全在本機處理」是本產品的核心信任基礎與差異化賣點。

### III. 核心與介面分離

- 圖片處理邏輯（解碼、編輯合成、編碼、壓縮到目標大小）MUST 實作於獨立的 `core` 套件，
  MUST NOT 依賴任何 UI 框架或 DOM 以外的特定執行環境假設，且 MUST 可在 Web Worker 中執行。
- 編輯器 UI MUST 以可重用套件提供，網頁版（PWA）與瀏覽器外掛 MUST 共用同一份核心與編輯器程式碼；
  各平台專屬程式碼僅限於「殼」（進入點、權限、平台 API 介接）。
- 套件之間 MUST 透過明確的型別化介面溝通；跨套件的公開介面變更 MUST 有對應的契約測試。
- 編輯 MUST 是非破壞式的：原始圖片保持不變，編輯內容以可序列化的文件模型保存，
  僅在匯出時合成。

**理由**：同一套能力要服務網頁與外掛兩種環境；分離才能獨立測試、在 Worker 中執行而不阻塞 UI，
並避免平台間程式碼分岔。

### IV. 使用者體驗與無障礙

- 介面 MUST 支援淺色與暗黑模式（預設跟隨系統），並在 360px 寬的行動裝置到桌面尺寸下可完整操作。
- 所有功能 MUST 可僅用鍵盤完成；常用工具 MUST 提供快捷鍵；互動元素 MUST 有可讀的無障礙名稱，
  色彩對比 MUST 符合 WCAG 2.2 AA。
- 耗時的影像編碼 MUST 在 Web Worker 中執行，主執行緒 MUST NOT 因圖片處理產生 > 200ms 的長任務。
- 首次載入的 JS（gzip 後、不含延遲載入的 WASM codec）MUST ≤ 200 KB；WASM codec MUST 延遲載入。
- 失敗 MUST 有明確且可行動的錯誤訊息（說明發生什麼、使用者可以怎麼做）；任何處理流程 MUST NOT
  無限期卡住（必須有錯誤處理與逾時）。
- 無法達成使用者設定的目標（例如目標檔案大小）時，MUST 明確告知，MUST NOT 靜默回傳不符的結果。
- 介面文字 MUST 以繁體中文為預設語言，文字 MUST 集中管理以便日後多語化。

**理由**：本產品定位為高頻、快速的工具，體驗與可靠性就是功能本身。

### V. 簡潔與漸進交付

- 功能 MUST 依階段交付（地基 → 新 UI → 編輯器 → 外掛 → 擴充），每個階段完成時 MUST 可獨立部署並
  提供完整可用的價值。
- 只實作目前規格要求的功能（YAGNI）；新增相依套件 MUST 在 plan 中說明理由與替代方案比較。
- 複雜度 MUST 被證明合理：違反本憲章任一原則的設計 MUST 記錄於 plan 的 Complexity Tracking，
  說明原因與被否決的較簡單方案。

**理由**：重構範圍大，漸進交付可降低風險，並讓每一步都能被驗證。

## 技術與平台約束

- **語言與建置**：TypeScript（strict 模式）+ Vite；套件管理使用 npm workspaces，
  `package-lock.json` MUST 納入版本控制，CI 使用 `npm ci`。
- **專案結構**：monorepo，至少包含 `packages/core`、`packages/editor`、`apps/web`、`apps/extension`。
  UI 框架與畫布函式庫於 plan 階段決定並記錄理由。
- **發佈**：MUST 透過 GitHub Actions 發佈，禁止手動上傳建置產物。
  - 推送到 `main`：建置網頁版並部署到 GitHub Pages。
  - 推送版本 tag（`v*.*.*`）：打包外掛並建立 GitHub Release；外掛版本號 MUST 由 tag 產生。
  - 機密（商店憑證等）MUST 存放於 GitHub Secrets，MUST NOT 進入 repo。
- **瀏覽器支援**：網頁版支援 Chrome、Edge、Firefox、Safari 的最近兩個主要版本；
  外掛優先支援 Chromium 系（Chrome/Edge，Manifest V3）。不支援的 API MUST 有降級方案並經測試。
- **版本**：產品採語意化版本（SemVer）。

## 開發流程與品質關卡

- **規格驅動**：新功能 MUST 依 Spec Kit 流程進行：`/speckit-specify` → （`/speckit-clarify`）→
  `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`。
- **語言**：規格文件（spec、plan、tasks、checklist 等）與 AI 助手的回答 MUST 使用繁體中文；
  程式碼識別字、技術名詞、commit 類型前綴保留原文。
- **CI 關卡**：每個 PR MUST 通過型別檢查、lint、格式檢查、單元與元件測試、E2E 測試、
  網頁與外掛建置，以及覆蓋率與 bundle 大小門檻；任一失敗 MUST NOT 合併。
- **Commit**：採用 Conventional Commits（`feat:`、`fix:`、`test:`、`refactor:`、`docs:`、`ci:` 等）。
  TDD 的 Red 階段允許以 `test:` commit 提交失敗測試，但合併到 `main` 時 MUST 全部通過。
- **審查**：PR 審查 MUST 確認：測試先於實作、符合本憲章各原則、無遠端程式碼載入、
  無新增不必要的權限或相依套件。

## Governance

- 本憲章優先於所有其他開發規範與慣例。`AGENTS.md`、README 或其他文件與本憲章衝突時，以本憲章為準，
  且衝突文件 MUST 在下一次相關變更中更新。
- **修訂程序**：修訂 MUST 以 PR 提出，說明變更內容、理由與對既有程式碼的遷移影響；
  經專案維護者核准後合併，並同步更新 Sync Impact Report 與相關模板。
- **版本政策**：
  - MAJOR：移除或重新定義原則等不相容的治理變更。
  - MINOR：新增原則或章節，或實質擴充既有指引。
  - PATCH：措辭澄清、錯字修正等不影響語意的調整。
- **合規檢查**：每份 plan MUST 通過 Constitution Check；每個 PR 審查 MUST 驗證合規性；
  `/speckit-analyze` 發現的憲章衝突一律視為 CRITICAL。
- 執行期開發指引以 `AGENTS.md` 為準。

**Version**: 1.0.1 | **Ratified**: 2026-11-06 | **Last Amended**: 2026-11-06

<!-- Knowie: Project Knowledge -->
## Project Knowledge

This project maintains structured knowledge in `knowledge/`:

- **Principles** (`knowledge/principles.md`): Core axioms and derived development principles — the project's non-negotiable rules.
- **Vision** (`knowledge/vision.md`): Goals, current state, architecture decisions, and roadmap.
- **Experience** (`knowledge/experience.md`): Distilled lessons from past development — patterns, pitfalls, and takeaways.

Read these files at the start of any task to understand the project's *why* and constraints.
Additional context may be found in `knowledge/concepts/`, `knowledge/history/`, and `knowledge/draft/`.

Learned procedures live in `knowledge/skills/` (agentskills.io SKILL.md format). If your tool auto-loads skills, they may be projected into your skill directory; otherwise read the relevant `SKILL.md` there and follow it.
<!-- /Knowie -->
