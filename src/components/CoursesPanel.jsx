import { useState } from "react";
import { RULES } from "../data/rules.js";
import { parseTranscript } from "../lib/parse.js";
import { norm, r, termLabel, groupByTerm, sumCredits } from "../lib/util.js";
import CatSelect from "./CatSelect.jsx";
import CourseList from "./CourseList.jsx";

const PLACEHOLDER = [
  "114學年度第1學期(114年9月至115年1月)",
  "必  離散數學  3.00  A+",
  "必  數位電路設計#  3.00  A+",
  "語  西班牙文(一)  2.00  A+",
].join("\n");

export default function CoursesPanel({ courses, setCourses, year, onImport }) {
  const [paste, setPaste] = useState("");
  const [staged, setStaged] = useState(null); // { rows, meta }

  const parse = () => {
    const { rows, meta } = parseTranscript(paste);
    // 已經在清單裡的（同學期同課名）預設不勾，避免每學期重貼整份就重複
    const existing = new Set(courses.map((c) => `${c.term || ""}|${norm(c.name)}`));
    setStaged({
      meta,
      rows: rows.map((s) => (existing.has(`${s.term}|${norm(s.name)}`) ? { ...s, keep: false, dup: true } : s)),
    });
  };

  const patchStaged = (id, k, v) =>
    setStaged((st) => ({ ...st, rows: st.rows.map((y) => (y.id === id ? { ...y, [k]: v } : y)) }));

  const commit = () => {
    const rows = staged.rows.filter((s) => s.keep).map(({ keep, ambiguous, pending, dup, ...c }) => c);
    onImport(rows, staged.meta);
    setStaged(null);
    setPaste("");
  };

  const keepCount = staged ? staged.rows.filter((s) => s.keep).length : 0;
  const dupCount = staged ? staged.rows.filter((s) => s.dup).length : 0;
  const entryYear = staged?.meta.entryYear;
  const yearHint = entryYear && entryYear !== year
    ? (RULES[entryYear] ? `入學學年度將設為 ${entryYear}` : `成績單顯示 ${entryYear} 學年度入學，本工具尚未支援該學年度的規則，維持 ${year}`)
    : null;

  return (
    <section className="panel" aria-labelledby="courses-title">
      <h2 id="courses-title">已修課程</h2>

      <details className="importer">
        <summary>從歷年成績表貼上</summary>
        <p className="hint">
          到學校系統開「歷年成績表」，全選複製後整份貼進來。學期標題、抵免、排名與統計列會自動處理；
          課別欄（必／選／核／語／體）用來分類，<code>#</code> 讀成英語授課。每學期重貼整份也沒關係，已匯入的會自動略過。
        </p>
        <textarea value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={PLACEHOLDER}
          aria-label="歷年成績表內容" />
        <button className="primary" onClick={parse} disabled={!paste.trim()}>解析</button>
      </details>

      {staged && (
        <div className="staging">
          {staged.rows.length === 0 ? (
            <p className="hint">沒有解析出任何課程。請確認貼的是成績表的內容，每門課一列。</p>
          ) : (
            <p className="hint">確認後匯入。標黃的是「核／通」課別 —— 成績單不分基本素養和領域，要自己選。</p>
          )}

          {groupByTerm(staged.rows).map((g) => (
            <div className="sgroup" key={g.term}>
              <h3>{termLabel(g.term)}<span className="termmeta">{g.items.length} 門 · {r(sumCredits(g.items))} 學分</span></h3>
              {g.items.map((s) => (
                <div className={"srow" + (s.ambiguous ? " amb" : "") + (s.dup ? " dup" : "")} key={s.id}>
                  <input type="checkbox" checked={s.keep} aria-label={`匯入 ${s.name || "這門課"}`}
                    onChange={(e) => patchStaged(s.id, "keep", e.target.checked)} />
                  <input className="sname" value={s.name} aria-label="課程名稱"
                    onChange={(e) => patchStaged(s.id, "name", e.target.value)} />
                  <input className="scred" type="number" step="0.5" inputMode="decimal" value={s.credits} aria-label="學分"
                    onChange={(e) => patchStaged(s.id, "credits", Number(e.target.value))} />
                  <CatSelect value={s.cat} label="分類" onChange={(e) => patchStaged(s.id, "cat", e.target.value)} />
                  {(s.dup || s.pending) && (
                    <div className="sbadges">
                      {s.dup && <span className="badge dup">已匯入</span>}
                      {s.pending && <span className="badge pending">成績未定</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}

          {(dupCount > 0 || yearHint || staged.meta.ethics) && (
            <div className="metahints">
              {dupCount > 0 && <span>{dupCount} 門已經在清單裡，預設不勾。</span>}
              {yearHint && <span>{yearHint}。</span>}
              {staged.meta.ethics && <span>成績單註記「學術倫理通過」，匯入後自動勾選該門檻。</span>}
            </div>
          )}

          <div className="srowbtns">
            <button className="primary" onClick={commit} disabled={keepCount === 0 && !staged.meta.ethics && !yearHint}>
              匯入 {keepCount} 門
            </button>
            <button className="ghost" onClick={() => setStaged(null)}>取消</button>
          </div>
        </div>
      )}

      <CourseList courses={courses} setCourses={setCourses} hideEmpty={!!staged} />
    </section>
  );
}
