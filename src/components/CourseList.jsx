import { useState, useEffect } from "react";
import { CATS } from "../data/rules.js";
import { guess } from "../lib/catalog.js";
import { r, uid, termLabel, termSort, TERM_RE, groupByTerm, sumCredits } from "../lib/util.js";
import CatSelect from "./CatSelect.jsx";

const CAT_LABEL = Object.fromEntries(CATS);

/** 預設收合的學期：除了最新的一個學期以外全部收合；抵免與未分學期保持展開 */
function defaultClosed(courses) {
  const terms = [...new Set(courses.map((c) => c.term).filter((t) => TERM_RE.test(t)))].sort(termSort);
  return new Set(terms.slice(0, -1));
}

export default function CourseList({ courses, setCourses, hideEmpty }) {
  const [editingId, setEditingId] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [closed, setClosed] = useState(() => defaultClosed(courses));

  // 學期組合改變（例如匯入了新學期）→ 重新套用預設：只展開最新學期
  const termKey = [...new Set(courses.map((c) => c.term || ""))].sort(termSort).join(",");
  useEffect(() => { setClosed(defaultClosed(courses)); /* eslint-disable-line react-hooks/exhaustive-deps */ }, [termKey]);

  const patch = (id, k, v) => {
    setCourses((cs) => cs.map((c) => (c.id === id ? { ...c, [k]: v } : c)));
    if (k === "term") setClosed((s) => { const n = new Set(s); n.delete(v); return n; });
  };
  const remove = (id) => {
    setCourses((cs) => cs.filter((c) => c.id !== id));
    if (editingId === id) setEditingId(null);
  };
  const addCourse = () => {
    const id = uid();
    setCourses((cs) => [...cs, { id, name: "", credits: 3, cat: "unknown", eng: false, term: "" }]);
    setClosed((s) => { const n = new Set(s); n.delete(""); return n; });
    setEditingId(id);
  };
  const clearAll = () => {
    setCourses([]);
    setConfirmClear(false);
    setEditingId(null);
  };
  const toggle = (term, open) => setClosed((s) => {
    const n = new Set(s);
    if (open) n.delete(term); else n.add(term);
    return n;
  });

  const groups = groupByTerm(courses);
  const termOptions = [...new Set(["TR", "", ...courses.map((c) => c.term || "")])].sort(termSort);

  return (
    <>
      {courses.length === 0 && !hideEmpty && (
        <p className="empty">還沒有課程。貼上歷年成績表，或手動新增一門。</p>
      )}

      {groups.map((g) => (
        <details className="term" key={g.term} open={!closed.has(g.term)}
          onToggle={(e) => toggle(g.term, e.currentTarget.open)}>
          <summary>
            <span className="termname">{termLabel(g.term)}</span>
            <span className="termmeta">{g.items.length} 門 · {r(sumCredits(g.items))} 學分</span>
          </summary>
          <div className="termbody">
            {g.items.map((c) => (c.id === editingId
              ? <EditRow key={c.id} c={c} patch={patch} remove={remove} termOptions={termOptions}
                  onDone={() => setEditingId(null)} />
              : <Line key={c.id} c={c} onEdit={() => setEditingId(c.id)} />
            ))}
          </div>
        </details>
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
    </>
  );
}

/* 精簡列：點一下展開成輸入框 */
function Line({ c, onEdit }) {
  return (
    <button type="button" className={"cline" + (c.cat === "unknown" ? " warn" : "")} onClick={onEdit}
      aria-expanded={false} aria-label={`編輯 ${c.name || "未命名課程"}`}>
      <span className="cl-name">
        {c.name || <em>（未命名）</em>}
        {c.eng && <span className="cl-eng" title="英語授課">#</span>}
      </span>
      <span className={"chip cat-" + c.cat}>{CAT_LABEL[c.cat] || c.cat}</span>
      <span className="cl-cred">{r(c.credits)}</span>
    </button>
  );
}

function EditRow({ c, patch, remove, termOptions, onDone }) {
  return (
    <div className="crow" role="group" aria-label={`編輯 ${c.name || "未命名課程"}`}
      onKeyDown={(e) => { if (e.key === "Escape") onDone(); }}>
      <input className="cname" value={c.name} placeholder="課程名稱" aria-label="課程名稱" autoFocus
        onChange={(e) => patch(c.id, "name", e.target.value)}
        onBlur={(e) => {
          if (c.cat === "unknown" && e.target.value) {
            const g = guess(e.target.value);
            if (g.cat !== "unknown") patch(c.id, "cat", g.cat);
          }
        }} />
      <input className="ccred" type="number" step="0.5" inputMode="decimal" value={c.credits} aria-label="學分"
        onChange={(e) => patch(c.id, "credits", Number(e.target.value))} />
      <button className={"engbtn" + (c.eng ? " on" : "")} title="英語授課" aria-label="英語授課"
        aria-pressed={!!c.eng} onClick={() => patch(c.id, "eng", !c.eng)}>#</button>
      <button className="del" onClick={() => remove(c.id)} aria-label={`刪除 ${c.name || "這門課"}`}>×</button>

      <CatSelect className="catsel" value={c.cat} label="分類" onChange={(e) => patch(c.id, "cat", e.target.value)} />
      <select className="termsel" value={c.term || ""} aria-label="學期" onChange={(e) => patch(c.id, "term", e.target.value)}>
        {termOptions.map((t) => <option key={t} value={t}>{termLabel(t)}</option>)}
      </select>
      <button className="ghost small" onClick={onDone}>完成</button>
    </div>
  );
}
