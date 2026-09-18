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
const TERM_RE = /^(\d{3})學年度第(\d)學期/;
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
export function parseTranscript(text) {
  const rows = [];
  const meta = { entryYear: null, ethics: false };
  let term = ""; // 目前所在學期；第一個學期標題出現前為未分學期

  const lines = text.split(/\r?\n/).flatMap((raw) => raw.replace(/\t/g, "  ").trim().split(SPLIT_RE));

  for (let t of lines) {
    t = t.trim();
    if (!t) continue;

    const tm = TERM_RE.exec(t);
    if (tm) { term = `${tm[1]}-${tm[2]}`; continue; }
    const em = ENTRY_RE.exec(t);
    if (em) { meta.entryYear = Number(em[1]); continue; }
    if (/^學術倫理通過/.test(t)) { meta.ethics = true; continue; }
    if (SKIP_RE.test(t)) continue;

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

    const eng = /#/.test(name);
    name = name.replace(/[#▲§*○●]+/g, "").trim();
    name = name.replace(/^[A-Za-z0-9-]{5,}\s+/, "").trim();
    if (!name) continue;

    const g = grade.toUpperCase();
    if (/^(F|X|W)\b/.test(g) || /^\*(?!\*)/.test(g)) continue; // 不及格、不計學分、停修
    const pending = /^\*\*/.test(g) || /^I\b/.test(g);          // 成績未送達／未完成
    const rowTerm = /^TR\b/.test(g) ? "TR" : term;

    const guessed = guess(name);
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
