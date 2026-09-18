export default function GatesPanel({ gateList, year, setGates }) {
  return (
    <section className="panel" aria-labelledby="gates-title">
      <h2 id="gates-title">畢業門檻</h2>
      <p className="hint">這些項目多半 0 學分，但沒過一樣不能畢業。從成績單能判斷的會自動勾。</p>
      {gateList.map((g) => (
        <div className={"gate" + (g.on ? "" : " off")} key={g.id}>
          <label className="gatemain">
            <input
              type="checkbox"
              checked={g.done}
              disabled={!g.on || g.satisfiedAuto}
              onChange={(e) => setGates((x) => ({ ...x, [`${year}:${g.id}`]: e.target.checked }))}
            />
            <span>
              {g.label}
              {g.satisfiedAuto && g.autoNote && <em className="gatenote auto">{g.autoNote}</em>}
              {!g.satisfiedAuto && g.progressNote && <em className="gatenote">{g.progressNote}</em>}
              {!g.satisfiedAuto && !g.progressNote && g.note && <em className="gatenote">{g.note}</em>}
            </span>
          </label>
          <span className="applies">{g.on ? (g.satisfiedAuto ? "自動" : "適用") : "不適用"}</span>
        </div>
      ))}
    </section>
  );
}
