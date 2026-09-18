import { r } from "../lib/util.js";

export default function Hero({ result, rules, remaining, gatesDone, gatesTotal }) {
  const status = remaining > 0
    ? <span className="still">還差 {r(remaining)} 學分</span>
    : <span className="done">學分已達標</span>;

  return (
    <>
      <section className="hero" aria-label="總覽">
        <div className="herotop">
          <div className="big">
            <span className="num">{r(result.total)}</span>
            <span className="denom">/ {rules.total}</span>
          </div>
          <div className="heroright">
            {status}
            <span className="gatecount">畢業門檻 {gatesDone} / {gatesTotal}</span>
          </div>
        </div>
        {/* 分段條只是桶位清單的圖像化，對讀屏器隱藏避免重複 */}
        <div className="segbar" aria-hidden="true">
          {result.buckets.map((b) => (
            <div className="seg" key={b.key} style={{ flexGrow: b.cap }} title={`${b.label} ${r(b.got)}/${b.cap}`}>
              <div className="segtrack">
                <div className="segfill" style={{ width: `${Math.min(100, (b.got / b.cap) * 100)}%` }} />
              </div>
              <div className="seglabel">
                <span className="full">{b.label}</span>
                <span className="short">{b.short}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 手機版：捲動時貼在頂端的摘要，內容與上面重複所以對讀屏器隱藏 */}
      <div className="stickybar" aria-hidden="true">
        <span><b>{r(result.total)}</b> / {rules.total}</span>
        {status}
      </div>
    </>
  );
}
