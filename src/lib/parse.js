import { guess } from "./catalog.js";
import { uid } from "./util.js";

/* 成績單「課別」欄 → 桶位 */
export const CODE_MAP = {
  必: "required", 選: "prof", 核: "domain", 語: "lang",
  體: "excluded", 服: "excluded", 通: "domain", 自: "free",
  輔: "free", 研: "prof", 軍: "excluded",
};

const CODES = "必選核語體服通自輔研軍";
const CODE_RE = new RegExp(`^([${CODES}])\\s+`);

/* 歷年成績表裡不是課程的列：表頭、統計、排名、說明 */
const SKIP_RE = new RegExp(
  "^(課別|科目名稱|學分|成績|學號|姓名|學院|系所組別|輔系|雙主修|跨域學程|入學年月|畢業年月|國立陽明|" +
  "修習學分|實得學分|學期平均|學期排名|累計|歷年|抵免學分合計|說明|※|GPA|\\d+/\\d+)"
);
/* 說明文字的續行（換行後不再以「說明」開頭）與日期列 */
const LEGEND_RE = /不通過|停修|不計學分|英語授課|境外修習|跨學期課程|成績未送達|^\d{4}年\d{1,2}月\d{1,2}日$/;
/* 歷年成績表的分節標題，或學期成績通知單的大標題；OCR 會在字之間插空白，所以容忍 \s* */
const TERM_RE = /(\d{3})?\s*學\s*年\s*度\s*第?\s*(\d)\s*學\s*期/;
/* 出現在列中任何位置就代表不是課程：抬頭欄位、說明文字的碎片（OCR 常把它們切得不成句） */
const JUNK_RE = /姓名|系所組別|學士班|科目名|學分成績|未完成|未送達|不及格|基礎服務|專業服務|;.*;/;
const ENTRY_RE = /入學年月\s*(\d{3})/;
/* 兩欄版面貼過來時，一列會有兩門課：在「學分 成績」之後又接課別碼的地方切開 */
const SPLIT_RE = new RegExp(`(?<=\\d\\.\\d{1,2}\\s+\\S+)\\s+(?=[${CODES}]\\s+)`);

/**
 * 把整份歷年成績表文字解析成待確認的課程列。
 * 回傳 { rows, meta }：
 * - rows：{ id, name, credits, cat, eng, term, keep, ambiguous, pending }
 * - meta：{ entryYear, ethics } 從成績單抬頭與「學術倫理通過」讀到的資訊
 *
 * 成績代碼（依成績單說明）：F、*、X、W 不計；**（未送達）、I（未完成）計入但標 pending；
 * TR（抵免）計入且 term 記為 "TR"；P 與字母等第計入。
 */
export function parseTranscript(text, { strict = false } = {}) {
  const rows = [];
  const meta = { entryYear: null, ethics: false };
  let term = ""; // 目前所在學期；第一個學期標題出現前為未分學期
  let lastYear = null;

  const lines = text.split(/\r?\n/).flatMap((raw) => raw.replace(/\t/g, "  ").trim().split(SPLIT_RE));

  for (let t of lines) {
    t = t.trim();
    if (!t) continue;

    const em = ENTRY_RE.exec(t);
    if (em) { meta.entryYear = Number(em[1]); continue; }
    const tm = TERM_RE.exec(t);
    if (tm) {
      // OCR 可能把開頭的學年度讀掉：沿用上一個學期的學年度，再不然用入學學年度
      const year = tm[1] ? Number(tm[1]) : lastYear ?? meta.entryYear;
      if (year) { lastYear = year; term = `${year}-${tm[2]}`; }
      continue;
    }
    if (/倫理通過/.test(t)) { meta.ethics = true; continue; } // OCR 可能把「學術」讀壞，只認「倫理通過」
    if (SKIP_RE.test(t) || LEGEND_RE.test(t) || JUNK_RE.test(t)) continue;

    let code = null;
    const cm = CODE_RE.exec(t);
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
    // 嚴格模式（照片辨識）：沒有課別碼也沒有學分數字的列，或課名不到兩個中文字的，多半是雜訊
    if (strict && ((!code && credits === null) || (name.match(/[一-鿿]/g) || []).length < 2)) continue;

    const eng = /#/.test(name);
    name = name.replace(/[#▲§*○●]+/g, "").trim();
    name = name.replace(/^[A-Za-z0-9-]{5,}\s+/, "").trim();
    // OCR 常在中文字之間插空白
    name = name.replace(/(?<=[一-鿿()：])\s+(?=[一-鿿()：])/g, "");
    if (!name) continue;

    const g = grade.toUpperCase();
    if (/^(F|X|N|W)\b/.test(g) || /^\*(?!\*)/.test(g)) continue; // 不及格、不計學分（X／N）、停修
    const pending = /^\*\*/.test(g) || /^I\b/.test(g);          // 成績未送達／未完成
    const rowTerm = /^TR\b/.test(g) ? "TR" : term;

    const guessed = guess(name);
    if (guessed.fuzzy) name = guessed.name; // OCR 錯一個字：用目錄裡的正確課名
    let cat;
    if (code === "必") cat = guessed.cat === "basic" || guessed.cat === "excluded" ? guessed.cat : "required";
    else if (code === "選") cat = guessed.cat === "program" ? "program" : "prof";
    else if (code) cat = CODE_MAP[code] || guessed.cat;
    else cat = guessed.cat;

    rows.push({
      id: uid(), name,
      credits: credits ?? guessed.credits,
      cat, eng, term: rowTerm,
      keep: true, pending,
      ambiguous: code === "核" || code === "通",
    });
  }
  return { rows, meta };
}
