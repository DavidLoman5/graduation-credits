/* ================================================================== *
 * 規則表：以「入學學年度」為 key
 * 要支援新學年度只加一個物件，不動分配邏輯。
 * ================================================================== */

export const RULES = {
  114: {
    label: "114 學年度入學 · 資工系乙組",
    total: 128,
    caps: { basic: 14, required: 31, program: 12, prof: 30, free: 17, core: 18, lang: 6 },
    mins: { literacy: 6, domain: 8 },
    coreIntoFreeCap: 4,
    globalView: false,
    gates: [
      { id: "gpe", label: "通過程式能力鑑定", note: "「基礎程式設計」及格條件", on: true },
      { id: "eng", label: "1 門本系英文授課專業課程", note: "專題、研討類型除外", on: true, auto: "eng" },
      { id: "topic", label: "完成七大主題學程其中 1 個", note: "乙組必要", on: true, auto: "topic" },
      { id: "pe", label: "體育 6 學期", note: "0 學分", on: true },
      { id: "ethics", label: "學生學術及研究倫理教育課程", note: "", on: true },
      { id: "gender", label: "性別平等教育線上課程", note: "", on: true },
      { id: "mentor", label: "導師時間", note: "", on: true },
      { id: "service", label: "服務學習（一）（二）", note: "114 學年度前入學由學系自行規定；資工系不要求", on: false },
    ],
  },
  115: {
    label: "115 學年度入學 · 資工系乙組",
    total: 128,
    caps: { basic: 14, required: 31, program: 12, prof: 30, free: 17, core: 18, lang: 6 },
    mins: { literacy: 6, domain: 8 },
    coreIntoFreeCap: 4,
    globalView: true,
    gates: [
      { id: "gpe", label: "通過程式能力鑑定", note: "「基礎程式設計」及格條件", on: true },
      { id: "eng", label: "1 門本系英文授課專業課程", note: "專題、研討類型除外", on: true, auto: "eng" },
      { id: "topic", label: "完成七大主題學程其中 1 個", note: "", on: true, auto: "topic" },
      { id: "pe", label: "體育 6 學期", note: "0 學分", on: true },
      { id: "ethics", label: "學生學術及研究倫理教育課程", note: "", on: true },
      { id: "gender", label: "性別平等教育線上課程", note: "", on: true },
      { id: "mentor", label: "導師時間", note: "", on: true },
      { id: "service", label: "服務學習", note: "115 學年度起由學系自行規定，請向系辦確認", on: false },
    ],
  },
};

export const DEFAULT_YEAR = 114;

/* 課程分類（桶位）：[key, 顯示名稱] */
export const CATS = [
  ["basic", "基礎科學"],
  ["required", "必修"],
  ["program", "學程選修"],
  ["prof", "專業選修"],
  ["free", "自由選修"],
  ["literacy", "核心－基本素養"],
  ["domain", "核心－領域"],
  ["lang", "語言與溝通"],
  ["excluded", "不採計"],
  ["unknown", "未分類"],
];

export const CAT_KEYS = new Set(CATS.map(([k]) => k));
