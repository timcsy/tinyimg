# TinyImg — AI 助手指引

TinyImg 正在全面重構：要做成本機處理的圖片標註與壓縮工具，涵蓋網頁、PWA 和瀏覽器外掛。
方向與路線圖見 `knowledge/vision.md`。

## 動手前必讀

1. **`.specify/memory/constitution.md`**：專案憲章，效力最高。具體規則、門檻、技術約束、
   CI 關卡都在這裡。
2. **`knowledge/`**：專案的「為什麼」，從 `principles.md`、`vision.md`、`experience.md` 讀起
   （見下方 Project Knowledge）。

## 工作方式

- 依 Spec Kit 流程開發：`/speckit-specify` → `/speckit-clarify` → `/speckit-plan` →
  `/speckit-tasks` → `/speckit-implement`。
- 採用 TDD：先寫會失敗的測試，再實作；CI 全綠才算完成。
- 規格文件和回答一律使用繁體中文；程式碼識別字和技術名詞保留原文。

## 關於根目錄的舊版檔案

`index.html`、`script.js`、`styles.css` 是 2025-08-03 的舊版 v0，會在重構中被取代。
舊版的規則（例如「只能使用 CDN」）已經失效。舊版文件可以用 `git show b655abb:AGENTS.md` 查看，
決策轉移的經過見 `knowledge/history/`。

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
