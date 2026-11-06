---
description: "階段 0：地基 的任務清單"
---

# Tasks: 階段 0：地基（可靠的壓縮核心與對等網頁版）

**Input**: `/specs/001-foundation/` 的設計文件

**Prerequisites**: [plan.md](plan.md)、[spec.md](spec.md)、[research.md](research.md)、[data-model.md](data-model.md)、[contracts/](contracts/)

**Tests**: 必要。憲章 I 規定採用 TDD，每個實作任務之前都有一個「先寫、確認失敗」的測試任務。

**Organization**: 依 user story 分組，每個 story 可以獨立完成和驗證。

## Format: `[ID] [P?] [Story] Description`

- **[P]**：可以平行進行（不同檔案，也不依賴未完成的任務）
- **[Story]**：對應 spec.md 的 user story

---

## Phase 1: Setup（專案初始化）

- [X] T001 在 repo 根目錄建立 `package.json`：`"private": true`、`"workspaces": ["packages/*", "apps/*"]`、`"engines": {"node": ">=22.12"}`；scripts 包含 `dev`、`build`、`typecheck`、`lint`、`format`、`format:check`、`test`、`test:coverage`、`e2e`、`size`，並加入 `.nvmrc`（內容為 `24`）
- [X] T002 建立 `tsconfig.base.json`：`strict: true`、`noUncheckedIndexedAccess: true`、`module: "ESNext"`、`moduleResolution: "Bundler"`、`target: "ES2022"`、`lib: ["ES2022", "DOM", "DOM.Iterable", "WebWorker"]`
- [X] T003 [P] 建立 `eslint.config.js`（flat config，使用 typescript-eslint 與 eslint-plugin-svelte）、`.prettierrc`（加上 prettier-plugin-svelte）、`.prettierignore`，並更新 `.gitignore`，加入 `node_modules/`、`dist/`、`coverage/`、`playwright-report/`、`test-results/`
- [X] T004 [P] 建立 `packages/core/package.json`：name 為 `@tinyimg/core`，`"type": "module"`，exports 包含 `.`、`./worker`、`./client`；建立 `packages/core/tsconfig.json` 與 `packages/core/vitest.config.ts`（Node 環境；v8 覆蓋率門檻：lines、functions、branches、statements 都是 90）
- [X] T005 [P] 建立 `apps/web/package.json`（name 為 `@tinyimg/web`，依賴 `@tinyimg/core`）、`apps/web/vite.config.ts`（使用 Svelte plugin，`base: '/tinyimg/'`，`worker.format: 'es'`）、`apps/web/tsconfig.json`、`apps/web/index.html`、`apps/web/src/main.ts`、`apps/web/src/App.svelte`（空殼）
- [X] T006 安裝相依套件並產生 `package-lock.json`。開發用：typescript@~6.0、vite@^8、vitest@^5、@vitest/coverage-v8@^5、svelte@^5、@sveltejs/vite-plugin-svelte、svelte-check、eslint@^10、typescript-eslint、eslint-plugin-svelte、prettier、prettier-plugin-svelte、@playwright/test、@axe-core/playwright。core 執行期：@jsquash/oxipng、@jsquash/jpeg、@jsquash/webp、image-q
- [X] T007 確認 `npm run typecheck`、`npm run lint`、`npm run build` 在空殼狀態下都能通過

---

## Phase 2: Foundational（所有 story 共用的前置）

- [X] T008 在 `packages/core/src/types.ts` 定義 data-model.md 的型別：RawImage（`data` 是 RGBA，長度為 width × height × 4）、SourceInfo、OutputFormat、CompressRequest（targetBytes 介於 `50 × 1024` 和 `10240 × 1024`；maxQuality 介於 0.1 和 1.0）、CompressResult（status 為 `'achieved' | 'original-fits' | 'unreachable'`；warnings 為 `'alpha-flattened' | 'animation-dropped'`）、CompressError（code 為 `'not-an-image' | 'decode-failed' | 'timeout' | 'invalid-request' | 'internal'`）、Codecs 介面
- [X] T009 建立 `packages/core/test/fixtures/generate.ts`：以固定種子產生 RawImage，包含 photo（漸層加雜訊，3000×2000）、screenshot ×10（平塗色塊加文字筆畫，1920×1080 到 2880×1800）、transparentPng（含 alpha）、huge（8000×6000），以及 2 幀的 GIF 位元組；另外寫 `packages/core/test/fixtures/fakeCodecs.ts`：可以指定「品質對應大小」曲線，並記錄每次呼叫
- [X] T010 在 `packages/core/src/index.ts` 匯出所有公開 API

---

## Phase 3: User Story 1 — 把圖片壓到目標大小，並誠實告知結果 (Priority: P1) 🎯 MVP

**Goal**: core 能把任何測試圖片壓到目標大小，或明確回報「無法達成」；並且能在 Worker 中執行、取消、逾時。

**Independent Test**: `npm run test:coverage -w @tinyimg/core` 全部通過，覆蓋率 ≥ 90%；整合測試證明 SC-001、SC-002。

### Tests for User Story 1（先寫，確認失敗）

- [X] T011 [P] [US1] 在 `packages/core/test/analyze.test.ts` 寫測試：`hasAlpha` 只要有任一像素 alpha 小於 255 就回傳 true；`flattenAlpha` 預設鋪白底；`isAnimatedGif` 對 2 幀 GIF 回傳 true、對 1 幀回傳 false、對非 GIF 回傳 false
- [X] T012 [P] [US1] 在 `packages/core/test/format.test.ts` 寫測試：`resolveFormat('auto', true)` 回傳 `'png'`，`resolveFormat('auto', false)` 回傳 `'jpeg'`，明確指定的格式原樣回傳
- [X] T013 [P] [US1] 在 `packages/core/test/resize.test.ts` 寫測試：`boxResize` 的輸出尺寸正確，純色圖縮放後顏色不變；`nextScale` 的回傳值永遠在 0.5 到 0.9 之間
- [X] T014 [P] [US1] 在 `packages/core/test/validate.test.ts` 寫測試：`validateRequest` 拒絕 targetBytes 超出 `50 × 1024` 到 `10240 × 1024` 的範圍、maxQuality 超出 0.1 到 1.0、未知的 format、空值與 NaN，並回傳 code 為 `invalid-request`、附繁體中文 message 的錯誤
- [X] T015 [P] [US1] 在 `packages/core/test/search.test.ts` 用 fakeCodecs 寫測試：二分搜尋找到符合目標的最高品質，品質在 `[0.3, maxQuality]` 內；以品質上限一次就符合時只編碼 1 次；搜尋最多 6 次
- [X] T016 [P] [US1] 在 `packages/core/test/compress.test.ts` 用 fakeCodecs 寫契約測試，涵蓋 contracts/core-api.md 的每一條保證：不變式（`status !== 'unreachable'` 時 `bytes.length <= targetBytes`）、品質不夠時縮尺寸、縮到最長邊 320 px 仍不符合時回傳 `unreachable` 和最小結果、`original-fits` 的判定規則、PNG 依序走「無損 → 256 → 128 → 64 色」、JPEG 遇到透明時鋪白並加上 `alpha-flattened` 警告、`isCancelled` 時 reject 並帶 `CancelledError`
- [X] T017 [P] [US1] 在 `packages/core/test/worker.test.ts` 寫測試：直接呼叫 worker 的訊息處理函式（注入假的 decode 和 codecs）。驗證 compress 會回傳 result；被新 id 取代時不回傳；解碼失敗時回傳 `decode-failed`；非圖片的 mimeType 回傳 `not-an-image`；`to-png` 回傳 png
- [X] T018 [P] [US1] 在 `packages/core/test/client.test.ts` 用假的 Worker 寫測試：`createCompressor` 在發新請求時，讓舊的 promise resolve 成 `{ superseded: true }`；逾時 30 秒（用 fake timers）時 reject 並帶 `timeout`，然後重建 worker
- [X] T019 [P] [US1] 寫整合測試 `packages/core/test/compress.integration.test.ts`（使用真實的 jsquash WASM，以 `init(fs.readFileSync)` 初始化）：對所有測試圖片和目標 50 KB、1 MB 做壓縮，驗證 SC-001，也就是不會靜默超標；並寫 `packages/core/test/png.integration.test.ts`：10 張截圖在目標 1 MB、格式 `auto` 時，至少 9 張為 `achieved`（SC-002）

### Implementation for User Story 1

- [X] T020 [P] [US1] 實作 `packages/core/src/analyze.ts`，讓 T011 通過
- [X] T021 [P] [US1] 實作 `packages/core/src/format.ts`，讓 T012 通過
- [X] T022 [P] [US1] 實作 `packages/core/src/resize.ts`，讓 T013 通過
- [X] T023 [P] [US1] 實作 `packages/core/src/validate.ts`，讓 T014 通過
- [X] T024 [US1] 實作 `packages/core/src/search.ts`，讓 T015 通過
- [X] T025 [US1] 實作 `packages/core/src/compress.ts`（compressToTarget，依 research R4），讓 T016 通過
- [X] T026 [US1] 實作 `packages/core/src/codecs/wasm.ts`：延遲 `import()` jsquash 與 image-q，提供 jpeg、webp 編碼，以及 PNG 的量化加 oxipng `optimiseRaw`；同時提供 Node 測試用的 `initForNode()`
- [X] T027 [US1] 實作 `packages/core/src/codecs/browser.ts`：用 `OffscreenCanvas.convertToBlob` 做 jpeg、webp 編碼，回傳的 type 和要求不同時改用 wasm.ts；縮放用 drawImage，`imageSmoothingQuality = 'high'`；解碼用 `createImageBitmap` 加 `getImageData`
- [X] T028 [US1] 實作 `packages/core/src/worker.ts`（訊息處理函式與 `self.onmessage` 綁定），讓 T017 通過
- [X] T029 [US1] 實作 `packages/core/src/client.ts`（createCompressor），讓 T018 通過
- [X] T030 [US1] 讓整合測試 T019 通過。如果 SC-002 沒有達標，調整 R4 的參數，並把調整記錄在 research.md（已記錄：R3 量化改為取樣建調色盤加查表映射，見 `packages/core/src/quantize.ts` 與 `test/quantize.test.ts`）
- [X] T031 [US1] 執行 `npm run test:coverage -w @tinyimg/core`，確認四項覆蓋率都 ≥ 90%，不足就補測試

**Checkpoint**: core 可以獨立使用，SC-001、SC-002 由測試證明。

---

## Phase 4: User Story 2 — 用熟悉的方式放入圖片，取得結果 (Priority: P2)

**Goal**: 和舊版功能對等的 Svelte 最小介面，操作方式遵循 contracts/web-ui.md。

**Independent Test**: `npm run e2e` 全部通過（SC-005、SC-006）。

### Tests for User Story 2（先寫，確認失敗）

- [X] T032 [P] [US2] 在 `apps/web/test/format.test.ts` 寫測試：`formatBytes`；`savingLabel` 在結果較小時顯示「節省 X%」，較大時顯示「增加 X%」，不會出現負數；`downloadName('a.png', 'image/jpeg')` 回傳 `a_compressed.jpg`，貼上的圖片名稱為 `pasted-image_compressed.*`
- [X] T033 [P] [US2] 在 `apps/web/test/store.test.ts` 寫測試（對象為 `src/lib/workspace.ts`）：工作區狀態機依 data-model.md 的狀態轉換運作，superseded 的結果會被丟棄
- [X] T034 [P] [US2] 建立 `apps/web/e2e/fixtures/`：用 core 的產生器輸出 photo.jpg、screenshot.png、transparent.png、anim.gif、not-image.txt、corrupt.png；並設定 `apps/web/playwright.config.ts`（Chromium，webServer 跑 `vite preview`，授予 clipboard 權限）
- [X] T035 [P] [US2] 寫 `apps/web/e2e/upload.spec.ts`：用選檔、拖曳（以 DataTransfer 模擬）、貼上（以 ClipboardEvent 模擬）各放入一次，都會顯示 `result-status`；連續選兩次同一個檔案都會處理
- [X] T036 [P] [US2] 寫 `apps/web/e2e/settings.spec.ts`：改變品質上限、目標大小、格式後結果會更新；目標大小填 0 或空白時出現 `role=alert`；目標 50 KB 時顯示「無法達成目標」，而且下載按鈕仍可使用
- [X] T037 [P] [US2] 寫 `apps/web/e2e/output.spec.ts`：複製後，讀回剪貼簿是 image/png；下載的檔名符合 `*_compressed.jpg`；透明圖選 JPEG 時顯示 warnings
- [X] T038 [P] [US2] 寫 `apps/web/e2e/errors.spec.ts`：放入 not-image.txt 和 corrupt.png，都在 30 秒內出現 `data-testid="error"`；放入 anim.gif 時顯示動畫未保留的警告
- [X] T039 [P] [US2] 寫 `apps/web/e2e/a11y.spec.ts`：用 axe 檢查初始狀態和有結果的狀態，零違規；只用鍵盤就能開啟檔案選擇；`prefers-color-scheme: dark` 時背景色會改變；360 px 寬時沒有水平捲軸

### Implementation for User Story 2

- [X] T040 [P] [US2] 實作 `apps/web/src/lib/format.ts` 與 `apps/web/src/lib/strings.ts`（所有介面文字集中於此），讓 T032 通過
- [X] T041 [US2] 實作 `apps/web/src/lib/workspace.ts`（與框架無關的狀態機，元件以 onChange 同步到 runes），以 `createCompressor` 建立 compressor，設定變更時 debounce 300 ms，讓 T033 通過
- [X] T042 [P] [US2] 實作 `apps/web/src/app.css`：在 `:root` 定義設計 token，加上 `prefers-color-scheme: dark`，並提供 focus 樣式
- [X] T043 [P] [US2] 實作 `apps/web/src/lib/DropZone.svelte`：role=button、鍵盤操作、拖曳、`file-input` 選完後重設 value；在 window 上監聽 paste
- [X] T044 [P] [US2] 實作 `apps/web/src/lib/Settings.svelte`：品質上限 10–100（預設 80）、目標大小 50–10240 KB（預設 1024）、格式選單（自動、JPEG、PNG、WebP，預設自動）；不合法時顯示 alert
- [X] T045 [P] [US2] 實作 `apps/web/src/lib/Comparison.svelte`：並排預覽，顯示 original-size、result-size、saving、result-status、warnings；處理中加上 aria-busy；預覽的 Object URL 在替換或卸載時 revoke
- [X] T046 [P] [US2] 實作 `apps/web/src/lib/Actions.svelte` 與 `apps/web/src/lib/Toast.svelte`：複製時用 `ClipboardItem({'image/png': promise})`，promise 經由 `compressor.toPng` 取得；不支援時顯示通知；下載使用 `downloadName`
- [X] T047 [US2] 在 `apps/web/src/App.svelte` 組裝所有元件，讓 T035 到 T039 全部通過
- [X] T048 [US2] 移除舊版的 `index.html`、`script.js`、`styles.css`（內容仍可從 git `b655abb` 取得）

**Checkpoint**: 網頁版功能和舊版對等，E2E 全部通過。

---

## Phase 5: User Story 3 — 每次變更自動驗證並發佈 (Priority: P3)

**Goal**: 開 PR 時自動跑全部檢查；合併到 main 時自動部署 Pages。

**Independent Test**: 推送一個讓測試故意失敗的 commit，CI 會失敗；合併到 main 後，Pages 會更新。

- [ ] T049 [P] [US3] 寫 `scripts/check-size.mjs`：從 `apps/web/dist/.vite/manifest.json` 找出入口 chunk 和它的靜態 import，加總 gzip 後的大小（不含 `.wasm` 和動態 import），超過 200 × 1024 bytes 就以 exit 1 結束；再寫 `scripts/check-size.test.mjs`，先證明超過預算時會失敗
- [ ] T050 [US3] 建立 `.github/workflows/ci.yml`：在 pull_request 和 push 時觸發，使用 Node 24，`npm ci` 後依序執行 lint、format:check、typecheck、test:coverage、build、size，接著安裝 Playwright chromium 並跑 e2e；失敗時上傳 playwright-report
- [ ] T051 [US3] 建立 `.github/workflows/pages.yml`：在 push 到 main 和 workflow_dispatch 時觸發；權限設為 `pages: write` 與 `id-token: write`；用 `concurrency: pages`；建置 `apps/web` 後執行 `actions/upload-pages-artifact`，再用 `actions/deploy-pages`
- [ ] T052 [US3] 用 `actionlint` 驗證兩個 workflow 檔（如果本機沒有，就用 `npx` 或 docker 執行）；把「Pages Source 要設為 GitHub Actions」以及 push 的需求記錄在 draft，等使用者確認

**Checkpoint**: CI/CD 設定完成，等使用者確認對外動作後就會啟用。

---

## Phase 6: Polish & Cross-Cutting

- [ ] T053 [P] 改寫 `README.md`：說明新架構、開發指令和部署網址
- [ ] T054 [P] 依 quickstart.md 從頭跑一遍所有驗證情境，並在 quickstart.md 標註實際結果
- [ ] T055 把 knowledge/vision.md 階段 0 的成功標準與實際狀態對照，提供給 `/knowie-judge` 收尾

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → US1 → US2（需要 US1 的 core）→ US3（需要可以建置的 web）→ Polish
- US3 的 T049 只依賴 Phase 1，可以提早平行進行
- 每個 story 內的順序是：測試（確認失敗）→ 實作 → 測試轉綠
- T024 依賴 T021；T025 依賴 T020 到 T024；T028 依賴 T025 到 T027；T047 依賴 T040 到 T046

## Parallel Example: User Story 1

```text
平行寫測試：T011、T012、T013、T014、T015、T016、T017、T018、T019
平行實作純函式：T020、T021、T022、T023
```

## Implementation Strategy

1. **MVP**：Phase 1 + Phase 2 + US1。這時 core 已經可靠，可以單獨驗證。
2. 加上 US2：網頁版功能和舊版對等，舊檔移除。
3. 加上 US3：CI/CD 準備好，對外部署要等使用者確認。
4. Polish，然後交給 `/knowie-judge` 收尾。
