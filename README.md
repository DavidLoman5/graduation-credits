# 畢業學分檢核 · 交大資工乙組

依 114 學年度資工系課程架構表、共同課程通則（112–114 學年度入學適用）與核心課程修習辦法
（115.06.15 核備）寫成的靜態網頁工具。資料預設存在瀏覽器 localStorage；若有設定自架 API，
可用 Google 登入把資料同步到自己的伺服器（見 [server/SETUP.md](server/SETUP.md)）。

## 開發

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm test           # vitest：lib/ 純函數與 server/validate.js 的測試
npm run lint       # ESLint
npm run check      # lint + test + build，push 前跑這個
```

CI（`.github/workflows/deploy.yml`）在每次 push 與 PR 都會跑 `lint`、`test`、`build`；
只有 `main` 會部署到 GitHub Pages。

## 部署到 GitHub Pages

1. 建 repo，把整個資料夾推上 `main`。
2. repo → Settings → Pages → Source 選 **GitHub Actions**。
3. 推上去之後 workflow 會自動 build 並部署。
4. 網址是 `https://<username>.github.io/<repo 名稱>/`。

**repo 名稱如果不是 `graduation-credits`**，要改 `vite.config.js` 裡的 `base`，
否則 JS 和 CSS 會 404。掛在 `<username>.github.io` 根目錄的話把 `base` 改成 `"/"`。

## 架構

```
src/
  main.jsx                 進入點
  App.jsx                  狀態管理 + 組合各面板
  App.css                  全部樣式（含手機／平板／觸控的 media query）
  data/rules.js            規則表 RULES（key 是入學學年度）、分類 CATS
  data/programs.js         七大主題學程的課程組成
  lib/util.js              norm()（課名正規化）、r()、uid()
  lib/catalog.js           CATALOG、guess()：課名 → 桶位
  lib/parse.js             parseTranscript()：歷年成績表解析，回傳 { rows, meta }
  lib/ocr.js               照片 OCR：前處理、Tesseract.js（動態載入）、cleanOcrText()
  lib/allocate.js          allocate()：桶位分配、溢流、上限
  lib/progress.js          programProgress()：主題學程進度
  lib/storage.js           localStorage 讀寫、normalizeData() 資料驗證
  cloud.js                 API 呼叫
  useCloudSync.js          登入後的雲端同步（排隊上傳、衝突處理）
  components/              Hero、Buckets、ProgramPanel、GatesPanel、CoursesPanel（匯入）、
                           CourseList（依學期分組的精簡清單）、CatSelect、DataBar、AuthBar、ConflictDialog
server/
  index.js                 Express + SQLite API（rate limit、graceful shutdown）
  validate.js              PUT /api/data 的資料驗證
  SETUP.md                 部署步驟
```

- `lib/` 全是純函數，不碰 DOM 與 React，每個模組旁邊都有 `*.test.js`。
- 要支援新學年度只在 `data/rules.js` 加一個物件，不動分配邏輯。
- `PROGRAMS` 同時是主題學程進度與課程目錄（`CATALOG`）的來源。
- 課程資料：`{ id, name, credits, cat, eng, term }`，`term` 是 `"114-1"`（學年-學期）、`"TR"`（抵免）或 `""`（未分學期）。

## 成績單匯入

兩種來源，最後都走同一套解析與確認流程：

- **拍照或上傳圖片**：用瀏覽器端的 Tesseract.js（`lib/ocr.js`）辨識，免費、不需伺服器、照片不離開裝置。
  第一次使用會從 CDN 下載約 1.7 MB 的繁中模型，之後快取在瀏覽器。流程：
  1. 前處理：EXIF 旋轉修正、放大到 2400px 寬、灰階、抹掉長水平線（表格框線與學期標題的底線）。
  2. 主辨識：不用 Tesseract 的文字輸出（它會把課名欄和學分欄切成不同區塊），改拿每個字的座標，
     用各行基線的中位斜率把歪斜的照片「扶正」後依 y 重組列。
  3. 補辨識：列距異常大的空隙（版面分析常漏掉粗體的學期標題和「學術倫理通過」）裁下來放大兩倍再讀一次。
  4. 清理與解析：`cleanOcrText()` 修常見錯誤（表格線、掉小數點、O 與 0、中文間空白）；
     `parseTranscript(text, { strict: true })` 丟掉沒有課別碼也沒有學分的雜訊列；課名只錯一個字時由 `guess()` 的模糊比對用目錄修回。

  實測：校務系統匯出的成績通知單圖片全對；手機拍的歷年成績表（歪斜、有浮水印）22 門課全部讀出、學期分組正確，
  偶有一兩門學分沒讀到會用目錄預設值，在確認畫面改即可。iPhone 的 HEIC 需先轉 JPG。
- **貼上文字**：從學校系統的「歷年成績表」全選複製貼上。

解析器會：

- 讀學期標題（`114學年度第1學期(...)`）給每門課 `term`；抵免（成績 `TR`）歸「抵免」組。
- 略過抬頭、`修習學分`／`實得學分`、排名、`累計`、`說明` 等非課程列；兩欄版面貼成一列的會自動拆開。
- 成績代碼：`F`、`*`、`X`、`N`、`W` 不計入；`**`（未送達）、`I`（未完成）計入但標「成績未定」；`TR`、`P`、字母等第計入。
- 學期成績通知單（單一學期）也能匯入：大標題的「114學年度第2學期」會當作該批課程的學期。
- 課名的 `#`（英語授課）與 `○`／`●`（服務學習）標記會去掉，`#` 記為 `eng`。
- 抬頭的「入學年月」會自動設定入學學年度；`學術倫理通過` 會自動勾選該門檻。
- 每學期重貼整份也沒關係：同學期同課名的預設不勾、標「已匯入」。

門檻自動判定：英語授課專業課程、主題學程、導師時間（課名含「導師時間」）、體育（課名含「體育」滿 6 門）。

## 規則備忘

- 基礎科學 14 ＝ 微積分 8 ＋ 三選一 6。物理(一)(二) 實際 8 學分，超出的 2 溢流到自由選修，不受 4 學分上限。
- 學程選修超修 → 專業選修 → 自由選修，這兩段不設上限。
- 核心 18（基本素養 ≥6、領域 ≥8）＋ 語言與溝通 6 ＝ 核心通識 24。資訊學院對四大領域不予限制。
- 通識超修進自由選修上限 4 學分（`coreIntoFreeCap`），超出的部分顯示為「未採計」；語言與溝通超修不受此限，可全數計入自由選修。
- 115 學年度起入學：基本素養需含必修「全球視野」2 學分。
- 服務學習自 114 學年度起由學系自行規定，資工系不要求，因此預設關閉。

實際採計以系辦與註冊組認定為準。

## 介面

- 900px 以下改單欄；600px 以下精簡課程列改成兩行。
- 已修課程依學期分組、可收合，預設只展開最新學期；每門課點一下才展開成輸入框，Esc 或「完成」收合。
- 手機版捲動時頂端有一條摘要（總學分／還差幾學分）。
- 觸控裝置上按鈕與輸入框最小 40px。
- 不用 `alert` / `confirm`：匯入失敗、清空確認、雲端衝突都在頁內處理。
