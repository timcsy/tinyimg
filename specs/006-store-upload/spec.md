# 功能規格：外掛自動上架商店

**分支**：`006-store-upload` · **建立日期**：2026-11-06 · **狀態**：小功能，簡化流程（spec、plan、tasks 合在本檔）
**輸入**：vision 階段 3「外掛自動上架商店」。帳號與第一次上架必須由使用者手動完成（見
`knowledge/draft/2026-11-06-對外發佈需要使用者確認.md` 第 6 項）；本規格只做「設好憑證之後，推 tag 就自動上傳」。

## 使用者故事

### US1：推 tag 後自動上傳到已上架的商店（P1）

維護者第一次手動上架之後，把商店憑證存成 GitHub secrets；之後每次推送 `vX.Y.Z` tag，
Release workflow 會把同一個 zip 上傳到 Chrome Web Store 和 Edge Add-ons。

**驗收情境**
1. 兩家商店的憑證都沒設定 → 上架步驟成功結束，並說明「略過」，Release 照常建立。
2. 只設定了某一家的部分憑證 → 失敗，列出缺少的變數**名稱**（絕不印出值）。
3. 憑證齊全、`STORE_PUBLISH` 未設定 → 只上傳成草稿，不送審。
4. 憑證齊全、`STORE_PUBLISH=1` → 上傳後送審。
5. 商店回應錯誤或上傳失敗 → 失敗並顯示商店回應的狀態碼與訊息（不含憑證）。

## 功能需求

- **FR-001**：上傳腳本只使用 Node 內建的 `fetch`，不新增任何相依套件（憲章 II：不引入不必要的遠端程式碼）。
- **FR-002**：Chrome 使用 Chrome Web Store API v2：以 refresh token 換 access token，`POST …/upload/v2/publishers/{publisher}/items/{item}:upload`，送審為 `POST …/v2/…:publish`。
- **FR-003**：Edge 使用 Add-ons API v1.1：標頭 `Authorization: ApiKey …`、`X-ClientID`；上傳到 `/v1/products/{id}/submissions/draft/package`，依 `Location` 輪詢上傳狀態直到不是 `InProgress`；送審為 `POST /v1/products/{id}/submissions`。
- **FR-004**：任何輸出（日誌、錯誤）都不得包含憑證的值。
- **FR-005**：預設只上傳不送審；送審要明確設定 `STORE_PUBLISH=1`。

## 成功標準

- **SC-001**：驗收情境 1–5 都有自動化測試（以假的 fetch 驗證請求的網址、方法、標頭、內容）。
- **SC-002**：測試證明輸出中不會出現任何憑證值。
- **SC-003**：Release workflow 在沒有憑證時行為與現在相同（建立 Release，不失敗）。

## 範圍外

- 第一次上架、商店頁面文案與截圖、隱私說明（需要使用者的帳號，只能手動）。
- 真的對商店發出請求（沒有帳號無法驗證；第一次實際執行時要人工確認結果）。

## 計畫與任務

- 新增 `apps/extension/scripts/store.mjs`（可注入 `fetch`、`sleep`、`env`）與 `store.test.mjs`（`node --test`，已在 `npm test` 的範圍內）。
- `release.yml` 在建立 Release 之後執行 `node apps/extension/scripts/store.mjs <zip>`，憑證從 secrets 傳入環境變數。
- 在 `apps/extension/README.md` 寫明要設定哪些 secrets、怎麼取得。

- [X] T001 先寫失敗的測試 `apps/extension/scripts/store.test.mjs`（情境 1–5、FR-004）
- [X] T002 實作 `apps/extension/scripts/store.mjs`
- [X] T003 更新 `.github/workflows/release.yml` 與 `apps/extension/README.md`
- [X] T004 `npm run verify`（背景），更新 vision 與 draft

## 驗證結果（2026-11-06）

- `store.test.mjs` 9 個通過：涵蓋情境 1–5、只設定 Chrome、Edge 一直 `InProgress` 會逾時，以及輸出不含憑證（SC-001、SC-002）。
- 沒有憑證時直接執行 CLI：印出「沒有設定商店憑證，略過上架。」並以 exit 0 結束（SC-003）。
- workflow 用 Ruby 的 YAML 解析器做了結構檢查（actionlint 被權限系統擋下）。
- `npm run verify`：lint、format、typecheck、全部單元與元件測試、build、size、平行 E2E 123 個都通過；
  依序執行的效能 E2E 有 2 個失敗（Chromium 一次、Firefox 一次），006 沒有改動網頁程式碼，見
  `knowledge/draft/2026-11-06-SC-003在Firefox與WebKit的預算.md`。
- 還沒對真的商店發出請求（沒有帳號）。
