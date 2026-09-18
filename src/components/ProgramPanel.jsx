import { PROGRAMS } from "../data/programs.js";

export default function ProgramPanel({ ranked, shown, target, setTarget }) {
  return (
    <section className="panel" aria-labelledby="program-title">
      <div className="phead">
        <h2 id="program-title">主題學程</h2>
        <select className="psel" value={target} onChange={(e) => setTarget(e.target.value)} aria-label="選擇主題學程">
          <option value="auto">自動比對（最接近）</option>
          {PROGRAMS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {shown && (
        <div className="prog">
          <div className="progtop">
            <span className="progname">{shown.name}</span>
            <span className={"progcount" + (shown.done ? " ok" : "")}>
              {shown.doneCount} / {shown.need}
              {shown.done ? "　已完成" : ""}
            </span>
          </div>
          {shown.pick && <p className="hint">十門課任選四門，無總整課程。</p>}
          <ul className="steps">
            {shown.rows.map((row, i) => (
              <li key={i} className={row.got ? "got" : ""}>
                <span className="mark">{row.got ? "✓" : "○"}</span>
                <span>{row.got || row.group.join(" 或 ")}</span>
              </li>
            ))}
            {shown.capstone && (
              <li className={(shown.capstoneGot ? "got" : "") + " capstone"}>
                <span className="mark">{shown.capstoneGot ? "✓" : "○"}</span>
                <span>{shown.capstone[0]}<em className="tag">總整課程</em></span>
              </li>
            )}
          </ul>
        </div>
      )}

      <details className="others">
        <summary>其他學程的進度</summary>
        <ul className="otherlist">
          {ranked.filter((p) => !shown || p.id !== shown.id).map((p) => (
            <li key={p.id}>
              <button className="plink" onClick={() => setTarget(p.id)}>{p.name}</button>
              <span>{p.doneCount} / {p.need}</span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
