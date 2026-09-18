/** 課名正規化：去空白、全形轉半形、統一大寫，用來比對 */
export function norm(s) {
  return String(s || "")
    .replace(/\s+/g, "")
    .replace(/（/g, "(").replace(/）/g, ")")
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .toUpperCase();
}

/** 顯示用：四捨五入到小數一位 */
export const r = (n) => (Math.round(n * 10) / 10).toString();

export const uid = () => Math.random().toString(36).slice(2, 9);

/* ------------------------------------------------------------------ *
 * 學期（term）："114-1" 學年-學期、"TR" 抵免、"" 未分學期
 * ------------------------------------------------------------------ */

export const TERM_RE = /^(\d{3})-(\d)$/;

export function termLabel(term) {
  if (!term) return "未分學期";
  if (term === "TR") return "抵免";
  const m = TERM_RE.exec(term);
  return m ? `${m[1]} 學年度第 ${m[2]} 學期` : term;
}

/** 排序：抵免最前，接著依學年、學期升冪，未分學期最後 */
export function termSort(a, b) {
  const rank = (t) => (t === "TR" ? 0 : t ? 1 : 2);
  return rank(a) - rank(b) || a.localeCompare(b);
}

/** 依 term 分組並排序，回傳 [{ term, items }] */
export function groupByTerm(list) {
  const map = new Map();
  for (const c of list) {
    const t = c.term || "";
    if (!map.has(t)) map.set(t, []);
    map.get(t).push(c);
  }
  return [...map.keys()].sort(termSort).map((term) => ({ term, items: map.get(term) }));
}

/** 學分加總（壞值當 0） */
export const sumCredits = (list) => list.reduce((a, c) => a + (Number(c.credits) || 0), 0);
