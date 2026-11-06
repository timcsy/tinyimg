# 001：從只用 CDN 到打包加 GitHub Actions 發佈
> 日期：2026-11-06

## 轉移
- 舊：只用 CDN 載入第三方函式庫，不需要建置，直接開啟 index.html 就能用。
  記錄於 2025-08-03 的 AGENTS.md（`git show b655abb:AGENTS.md` 第 193 行：
  「只能使用 CDN 版本的第三方函式庫」）。狀態：superseded
- 新：Vite + TypeScript 打包，npm lockfile 鎖定版本；用 GitHub Actions 發佈
  （push 到 main 部署 Pages，打 tag 發佈外掛）。

## 為什麼變
- 要做瀏覽器外掛：Manifest V3 禁止載入遠端程式碼，CDN 不可行。
- 使用者判斷：只用 CDN 已經是過時的做法。lockfile 讓建置結果可重現，CI 可以擋住壞掉的版本。
- 「零建置」原本的優點是部署簡單，但用 Actions 自動化後，部署一樣簡單。

## 狀態
✅ 已採用（記錄於憲章 v1.0.0「技術與平台約束」）
