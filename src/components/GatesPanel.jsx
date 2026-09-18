export default function GatesPanel({ gateList, year, setGates, engCandidates, doneProgs }) {
  return (
    <section className="panel" aria-labelledby="gates-title">
      <h2 id="gates-title">畢業門檻</h2>
      <p className="hint">這些項目多半 0 學分，但沒過一樣不能畢業。</p>
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
              {g.satisfiedAuto && g.id === "eng" && (
                <em className="gatenote auto">已偵測到：{engCandidates.map((c) => c.name).join("、")}</em>
              )}
              {g.satisfiedAuto && g.id === "topic" && (
                <em className="gatenote auto">已完成：{doneProgs.map((p) => p.name).join("、")}</em>
              )}
              {!g.satisfiedAuto && g.note && <em className="gatenote">{g.note}</em>}
            </span>
          </label>
          <span className="applies">{g.on ? (g.satisfiedAuto ? "自動" : "適用") : "不適用"}</span>
        </div>
      ))}
    </section>
  );
}
