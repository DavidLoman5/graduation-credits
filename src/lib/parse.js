import { guess } from "./catalog.js";
import { uid } from "./util.js";

/* 成績單「課別」欄 → 桶位 */
export const CODE_MAP = {
  必: "required", 選: "prof", 核: "domain", 語: "lang",
  體: "excluded", 服: "excluded", 通: "domain", 自: "free",
  輔: "free", 研: "prof", 軍: "excluded",
};

const HEADER_RE = /^(課別|科目名稱|修習學分|實得學分|說明|學號|姓名|系所組別|學院|年級|國立陽明|※|GPA)/;

/** 把整份成績通知單文字解析成待確認的課程列 */
export function parseTranscript(text) {
  const rows = [];
  for (const raw of text.split(/\r?\n/)) {
    let t = raw.replace(/\t/g, "  ").trim();
    if (!t) continue;
    if (HEADER_RE.test(t)) continue;

    let code = null;
    const cm = t.match(/^([必選核語體服通自輔研軍])\s+/);
    if (cm) { code = cm[1]; t = t.slice(cm[0].length).trim(); }

    let credits = null, grade = "", name = t;
    const dm = t.match(/(\d+\.\d{1,2})/);
    if (dm) {
      credits = Number(dm[1]);
      name = t.slice(0, dm.index).trim();
      grade = t.slice(dm.index + dm[0].length).trim();
    } else {
      const im = t.match(/\s(\d)(?:\s+(\S+))?\s*$/);
      if (im) { credits = Number(im[1]); grade = im[2] || ""; name = t.slice(0, im.index).trim(); }
    }
    if (!name) continue;

    const eng = /#/.test(name);
    name = name.replace(/[#▲§*]+/g, "").trim();
    name = name.replace(/^[A-Za-z0-9-]{5,}\s+/, "").trim();
    if (!name) continue;
    if (/^(F|W|\*)/.test(grade)) continue; // 不及格或停修不計

    const g = guess(name);
    let cat;
    if (code === "必") cat = g.cat === "basic" || g.cat === "excluded" ? g.cat : "required";
    else if (code === "選") cat = g.cat === "program" ? "program" : "prof";
    else if (code) cat = CODE_MAP[code] || g.cat;
    else cat = g.cat;

    rows.push({
      id: uid(), name,
      credits: credits ?? g.credits,
      cat, eng, keep: true,
      ambiguous: code === "核" || code === "通",
    });
  }
  return rows;
}
