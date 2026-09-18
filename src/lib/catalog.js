import { PROGRAMS } from "../data/programs.js";
import { norm } from "./util.js";

/* 課程目錄：貼上匯入時用來判斷「必」到底是基礎科學還是系必修 */
export const CATALOG = {};
const addCat = (cat, names, credits) => names.forEach((n) => (CATALOG[norm(n)] = { cat, credits }));

addCat("basic", ["微積分(一)", "微積分(二)", "物理(一)", "物理(二)"], 4);
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

/** 課名 → { cat, credits } 的猜測 */
export function guess(name) {
  const n = norm(name);
  if (CATALOG[n]) return CATALOG[n];
  // 子字串比對：輸入太短（如「一」）會誤中「微積分(一)」，所以兩邊都要夠長
  if (n.length >= 2) {
    for (const key of Object.keys(CATALOG)) {
      if (key.length >= 3 && (n.includes(key) || key.includes(n))) return CATALOG[key];
    }
  }
  if (/英文|ENGLISH|外語|日文|德文|法文|韓文|西班牙文|寫作|溝通與表達|台語|客語/.test(n))
    return { cat: "lang", credits: 2 };
  if (/體育|服務學習|軍訓|護理/.test(n)) return { cat: "excluded", credits: 0 };
  return { cat: "unknown", credits: 3 };
}
