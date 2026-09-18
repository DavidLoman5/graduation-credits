import { PROGRAMS } from "../data/programs.js";
import { norm } from "./util.js";

/* 課程目錄：貼上匯入時用來判斷「必」到底是基礎科學還是系必修；值是 { cat, credits, name } */
export const CATALOG = {};
const addCat = (cat, names, credits) => names.forEach((n) => (CATALOG[norm(n)] = { cat, credits, name: n }));

// 微積分在成績單上會帶甲／乙班別
addCat("basic", [
  "微積分(一)", "微積分(二)", "微積分甲(一)", "微積分甲(二)", "微積分乙(一)", "微積分乙(二)",
  "物理(一)", "物理(二)",
], 4);
addCat("basic", ["普通生物學(一)", "普通生物學(二)", "化學(一)", "化學(二)"], 3);
addCat("required", [
  "線性代數", "計算機概論與程式設計", "資料結構與物件導向程式設計", "離散數學",
  "數位電路設計", "機率", "演算法概論", "計算機組織", "作業系統概論",
], 3);
addCat("required", ["基礎程式設計", "資訊工程研討", "生涯規劃及導師時間"], 0);
addCat("required", ["資訊工程專題(一)", "資訊工程專題(二)"], 2);
PROGRAMS.forEach((p) => {
  p.groups.forEach((g) => addCat("program", g, 3));
  if (p.capstone) addCat("program", p.capstone, 3);
});
addCat("excluded", ["大一體育", "體育", "服務學習(一)", "服務學習(二)", "軍訓", "護理"], 0);

/** 兩字串是否只差一個字（取代、插入或刪除各算一） */
function withinOneEdit(a, b) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (a.length < b.length) j++;
    else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/**
 * 課名 → { cat, credits, name }。
 * 依序：精確比對 → 子字串比對 → 只差一個字的模糊比對（fuzzy: true，用來修 OCR 錯字）→ 關鍵字。
 */
export function guess(name) {
  const n = norm(name);
  if (CATALOG[n]) return CATALOG[n];
  // 子字串比對：輸入太短（如「一」）會誤中「微積分(一)」，所以兩邊都要夠長
  if (n.length >= 2) {
    for (const key of Object.keys(CATALOG)) {
      if (key.length >= 3 && (n.includes(key) || key.includes(n))) return CATALOG[key];
    }
  }
  // 模糊比對：四個字以上且只錯一個字，視為同一門課
  if (n.length >= 4) {
    for (const key of Object.keys(CATALOG)) {
      if (key.length >= 4 && withinOneEdit(n, key)) return { ...CATALOG[key], fuzzy: true };
    }
  }
  if (/英文|ENGLISH|外語|日文|德文|法文|韓文|西班牙文|寫作|溝通與表達|台語|客語/.test(n))
    return { cat: "lang", credits: 2 };
  if (/體育|服務學習|軍訓|護理/.test(n)) return { cat: "excluded", credits: 0 };
  return { cat: "unknown", credits: 3 };
}
