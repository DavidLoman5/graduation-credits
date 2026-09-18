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
