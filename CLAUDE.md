# CLAUDE.md

交大資工乙組畢業學分檢核工具。React 18 + Vite 靜態網頁，部署在 GitHub Pages；
可選的 Express + SQLite API（`server/`）提供 Google 登入與雲端同步。UI 文案全部是繁體中文。

## 指令

```bash
npm run dev          # 開發伺服器 http://localhost:5173
npm test             # vitest run（含 server/validate.test.js）
npm run lint         # ESLint 9 flat config
npm run check        # lint + test + build；改完程式碼跑這個
cd server && npm start   # API，需要 server/.env（見 server/.env.example）
```

CI 在每次 push / PR 跑 `lint`、`test`、`build`，只有 `main` 部署。

## 目錄地圖

| 路徑 | 內容 |
|------|------|
| `src/data/rules.js` | `RULES`：以入學學年度為 key 的規則表（上限、下限、門檻）。**要改學分規則只改這裡** |
| `src/data/programs.js` | `PROGRAMS`：七大主題學程，也是課程目錄的來源 |
| `src/lib/*.js` | 純函數：`parse`（歷年成績表解析，回傳 `{ rows, meta }`）、`allocate`（桶位分配）、`progress`（學程進度）、`catalog`（課名猜分類，含只差一字的模糊比對）、`storage`（localStorage + `normalizeData`）、`util`（`norm`、`termLabel`、`termSort`、`groupByTerm`） |
| `src/lib/ocr.js` | 照片 OCR：`preprocess`（canvas 前處理）、`recognize`（動態 `import("tesseract.js")`）、`cleanOcrText`（純函數，修 OCR 常見錯誤） |
| `src/components/` | 各面板；`App.jsx` 只做狀態與組合。`CoursesPanel` 負責貼上／staging／匯入，`CourseList` 是依學期分組的精簡清單（點一列才變成輸入框） |
| `src/App.css` | 全部樣式；breakpoint 900 / 600，`pointer: coarse` 放大觸控目標 |
| `src/useCloudSync.js` | 登入後同步：上傳排隊、序號、衝突狀態 |
| `server/index.js` | API；`server/validate.js` 是 PUT 資料驗證 |

## 慣例

- `lib/` 不 import React、不碰 DOM。新增或修改純函數時**同步更新旁邊的 `*.test.js`**。
- 課程物件是 `{ id, name, credits, cat, eng, term }`；`term` 為 `"114-1"`、`"TR"`（抵免）或 `""`。不存成績，成績只在解析時用來決定是否計入。
- `parse.test.js` 裡有一份去識別化的真實歷年成績表當整合案例（22 門、49 學分），改解析器時它必須維持通過。
- 成績單的非課程列（排名、累計、說明…）要加進 `parse.js` 的 `SKIP_RE` 或 `LEGEND_RE`，不要用特例處理。
- `tesseract.js` 只能動態 `import()`，不要在模組頂層引入；worker 與語言檔走 CDN（tesseract.js 預設），不放進 bundle。
- OCR 的固定錯誤模式（表格線、掉小數點、O/0）修在 `cleanOcrText()` 並加測試；課名錯字靠 `catalog.js` 的模糊比對，不要在 OCR 層硬編課名。
- 所有外來資料（localStorage、匯入 JSON、雲端）進 App 前都要過 `normalizeData()`。
- 不用 `alert` / `confirm` / `prompt`；確認動作用頁內 UI（兩段式按鈕或 `ConflictDialog`）。
- 樣式只寫在 `App.css`，不用 inline `<style>` 或 CSS-in-JS。UI 文案裡的全形空白（U+3000）是刻意的分隔。
- 桶位分配的溢流規則見 README「規則備忘」；改規則前先確認 `allocate.test.js` 的預期是否要跟著改。
- 每個 section 用 `aria-labelledby` 對到自己的 `<h2>`；純視覺重複的元素（分段條、sticky 摘要）要 `aria-hidden`。
- Commit 訊息用繁體中文，第一行說「做了什麼」。

## 雲端同步行為

- 未登入：只存 localStorage。
- 登入時：雲端沒資料 → 上傳本機；本機空 → 載入雲端；兩邊都有且不同 → `ConflictDialog` 讓使用者選。
- 登入後每次修改 1 秒後上傳，上傳串成佇列保證順序；session 30 天。
- API 有 rate limit（`/api/auth/*` 每 IP 15 分鐘 20 次，其他 300 次）。部署細節見 `server/SETUP.md`。
