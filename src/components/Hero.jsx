import { r } from "../lib/util.js";

export default function Hero({ result, rules, remaining, gatesDone, gatesTotal }) {
  return (
    <section className="hero">
      <div className="herotop">
        <div className="big">
          <span className="num">{r(result.total)}</span>
          <span className="denom">/ {rules.total}</span>
        </div>
        <div className="heroright">
          {remaining > 0
            ? <span className="still">還差 {r(remaining)} 學分</span>
            : <span className="done">學分已達標</span>}
          <span className="gatecount">畢業門檻 {gatesDone} / {gatesTotal}</span>
        </div>
      </div>
      <div className="segbar">
        {result.buckets.map((b) => (
          <div className="seg" key={b.key} style={{ flexGrow: b.cap }} title={`${b.label} ${r(b.got)}/${b.cap}`}>
            <div className="segtrack">
              <div className="segfill" style={{ width: `${Math.min(100, (b.got / b.cap) * 100)}%` }} />
            </div>
            <div className="seglabel">{b.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
