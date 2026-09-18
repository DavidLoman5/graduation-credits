import { RULES, DEFAULT_YEAR, CAT_KEYS } from "../data/rules.js";
import { uid } from "./util.js";

export const STORE_KEY = "nycu-grad-credits-v2";

/**
 * 把來路不明的資料（localStorage、匯入的 JSON、雲端）整理成 App 能用的形狀。
 * 壞掉的欄位用預設值補，缺 id 的課程補 id，不合法的分類改成 unknown。
 */
export function normalizeData(d) {
  const src = d && typeof d === "object" ? d : {};

  const year = Object.hasOwn(RULES, src.year) ? Number(src.year) : DEFAULT_YEAR;

  const courses = (Array.isArray(src.courses) ? src.courses : [])
    .filter((c) => c && typeof c === "object")
    .map((c) => {
      const credits = Number(c.credits);
      return {
        id: typeof c.id === "string" && c.id ? c.id : uid(),
        name: typeof c.name === "string" ? c.name : String(c.name ?? ""),
        credits: Number.isFinite(credits) ? credits : 0,
        cat: CAT_KEYS.has(c.cat) ? c.cat : "unknown",
        eng: Boolean(c.eng),
      };
    });

  const gates = {};
  if (src.gates && typeof src.gates === "object") {
    for (const [k, v] of Object.entries(src.gates)) {
      if (typeof v === "boolean") gates[k] = v;
    }
  }

  const target = typeof src.target === "string" && src.target ? src.target : "auto";

  return { year, courses, gates, target };
}

export function loadSaved() {
  try {
    return normalizeData(JSON.parse(localStorage.getItem(STORE_KEY)));
  } catch {
    return normalizeData(null);
  }
}

export function persist(data) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch { /* 無痕模式或容量已滿，不影響當次使用 */ }
}
