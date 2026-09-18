import { useState } from "react";
import { CATS } from "../data/rules.js";
import { guess } from "../lib/catalog.js";
import { parseTranscript } from "../lib/parse.js";
import { uid } from "../lib/util.js";

const PLACEHOLDER = "必  離散數學  3.00  A+\n必  數位電路設計#  3.00  A+\n語  西班牙文(一)  2.00  A+";

function CatSelect({ value, onChange, label }) {
  return (
    <select className={value === "unknown" ? "warnsel" : ""} value={value} onChange={onChange} aria-label={label}>
      {CATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
    </select>
  );
}

export default function CoursesPanel({ courses, setCourses }) {
  const [paste, setPaste] = useState("");
  const [staged, setStaged] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const addCourse = () => setCourses((cs) => [...cs, { id: uid(), name: "", credits: 3, cat: "unknown", eng: false }]);
  const patch = (id, k, v) => setCourses((cs) => cs.map((c) => (c.id === id ? { ...c, [k]: v } : c)));
  const remove = (id) => setCourses((cs) => cs.filter((c) => c.id !== id));
  const patchStaged = (i, k, v) => setStaged((x) => x.map((y, j) => (j === i ? { ...y, [k]: v } : y)));

  const commit = () => {
    setCourses((cs) => [...cs, ...staged.filter((s) => s.keep).map(({ keep, ambiguous, ...c }) => c)]);
    setStaged(null);
    setPaste("");
  };

  const clearAll = () => {
    setCourses([]);
    setConfirmClear(false);
  };

  return (
    <section className="panel" aria-labelledby="courses-title">
      <h2 id="courses-title">已修課程</h2>

      <details className="importer">
        <summary>從成績通知單貼上</summary>
        <p className="hint">整份貼進來就好，標題列和統計列會自動略過。課別欄（必／選／核／語／體）會用來分類，<code>#</code> 會被讀成英語授課。</p>
        <textarea value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={PLACEHOLDER}
          aria-label="成績通知單內容" />
        <button className="primary" onClick={() => setStaged(parseTranscript(paste))} disabled={!paste.trim()}>
          解析
        </button>
      </details>

      {staged && (
        <div className="staging">
          <p className="hint">
            確認後匯入。標黃的是「核／通」課別 —— 成績單不分基本素養和領域，要自己選。
          </p>
          {staged.map((s, i) => (
            <div className={"srow" + (s.ambiguous ? " amb" : "")} key={s.id}>
              <input type="checkbox" checked={s.keep} aria-label={`匯入 ${s.name || "這門課"}`}
                onChange={(e) => patchStaged(i, "keep", e.target.checked)} />
              <input className="sname" value={s.name} aria-label="課程名稱"
                onChange={(e) => patchStaged(i, "name", e.target.value)} />
              <input className="scred" type="number" step="0.5" inputMode="decimal" value={s.credits} aria-label="學分"
                onChange={(e) => patchStaged(i, "credits", Number(e.target.value))} />
              <CatSelect value={s.cat} label="分類" onChange={(e) => patchStaged(i, "cat", e.target.value)} />
            </div>
          ))}
          <div className="srowbtns">
            <button className="primary" onClick={commit}>匯入 {staged.filter((s) => s.keep).length} 門</button>
            <button className="ghost" onClick={() => setStaged(null)}>取消</button>
          </div>
        </div>
      )}

      {courses.length === 0 && !staged && (
        <p className="empty">還沒有課程。貼上成績通知單，或手動新增一門。</p>
      )}

      {courses.map((c) => (
        <div className="crow" key={c.id}>
          <input className="cname" value={c.name} placeholder="課程名稱" aria-label="課程名稱"
            onChange={(e) => patch(c.id, "name", e.target.value)}
            onBlur={(e) => {
              if (c.cat === "unknown" && e.target.value) {
                const g = guess(e.target.value);
                if (g.cat !== "unknown") patch(c.id, "cat", g.cat);
              }
            }} />
          <input className="ccred" type="number" step="0.5" inputMode="decimal" value={c.credits} aria-label="學分"
            onChange={(e) => patch(c.id, "credits", Number(e.target.value))} />
          <CatSelect value={c.cat} label="分類" onChange={(e) => patch(c.id, "cat", e.target.value)} />
          <button className={"engbtn" + (c.eng ? " on" : "")} title="英語授課" aria-label="英語授課"
            aria-pressed={!!c.eng} onClick={() => patch(c.id, "eng", !c.eng)}>#</button>
          <button className="del" onClick={() => remove(c.id)} aria-label={`刪除 ${c.name || "這門課"}`}>×</button>
        </div>
      ))}

      <div className="crowbtns">
        <button className="ghost" onClick={addCourse}>新增一門課</button>
        {courses.length > 0 && !confirmClear && (
          <button className="ghost danger" onClick={() => setConfirmClear(true)}>清空</button>
        )}
        {confirmClear && (
          <span className="confirmwrap" role="alert">
            確定清空 {courses.length} 門課？
            <button className="ghost danger" onClick={clearAll} autoFocus>確定清空</button>
            <button className="ghost" onClick={() => setConfirmClear(false)}>取消</button>
          </span>
        )}
      </div>
    </section>
  );
}
