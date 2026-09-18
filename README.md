# 畢業學分檢核 · 交大資工乙組

依 114 學年度資工系課程架構表、共同課程通則（112–114 學年度入學適用）與核心課程修習辦法
（115.06.15 核備）寫成的靜態網頁工具。資料預設存在瀏覽器 localStorage；若有設定自架 API，
可用 Google 登入把資料同步到自己的伺服器（見 [server/SETUP.md](server/SETUP.md)）。

## 開發

```bash
npm install
npm run dev
```

## 部署到 GitHub Pages

1. 建 repo，把整個資料夾推上 `main`。
2. repo → Settings → Pages → Source 選 **GitHub Actions**。
3. 推上去之後 `.github/workflows/deploy.yml` 會自動 build 並部署。
4. 網址是 `https://<username>.github.io/<repo 名稱>/`。

**repo 名稱如果不是 `graduation-credits`**，要改 `vite.config.js` 裡的 `base`，
否則 JS 和 CSS 會 404。掛在 `<username>.github.io` 根目錄的話把 `base` 改成 `"/"`。

## 架構

| 檔案 | 作用 |
|------|------|
| `src/App.jsx` | 全部邏輯與樣式 |
| `RULES` | 規則表，key 是入學學年度。要支援新學年度只加一個物件，不動分配邏輯 |
| `PROGRAMS` | 七大主題學程的課程組成，同時也是分類目錄的來源 |
| `CATALOG` / `guess()` | 課名 → 桶位的比對 |
| `parseTranscript()` | 成績通知單解析，讀「課別」欄 |
| `allocate()` | 桶位分配、溢流、上限 |
| `programProgress()` | 主題學程進度比對 |
| `src/useCloudSync.js` | 登入後的雲端同步邏輯 |
| `src/cloud.js` / `src/AuthBar.jsx` | API 呼叫、Google 登入按鈕 |
| `server/` | 自架 API（Express + SQLite），部署見 `server/SETUP.md` |

## 規則備忘

- 基礎科學 14 ＝ 微積分 8 ＋ 三選一 6。物理(一)(二) 實際 8 學分，超出的 2 溢流到自由選修，不受 4 學分上限。
- 學程選修超修 → 專業選修 → 自由選修，這兩段不設上限。
- 核心 18（基本素養 ≥6、領域 ≥8）＋ 語言與溝通 6 ＝ 核心通識 24。資訊學院對四大領域不予限制。
- 通識超修進自由選修上限 4 學分（`coreIntoFreeCap`）；語言與溝通超修不受此限，可全數計入自由選修。
- 115 學年度起入學：基本素養需含必修「全球視野」2 學分。
- 服務學習自 114 學年度起由學系自行規定，資工系不要求，因此預設關閉。

實際採計以系辦與註冊組認定為準。
