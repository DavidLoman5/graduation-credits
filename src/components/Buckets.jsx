import { useState } from "react";
import { r } from "../lib/util.js";

export default function Buckets({ result, rules }) {
  const [showRules, setShowRules] = useState(false);

  return (
    <section className="panel">
      <h2>學分桶位</h2>
      {result.buckets.map((b) => (
        <div className="bucket" key={b.key}>
          <div className="brow">
            <span className="bname">{b.label}</span>
            <span className={"bnum" + (b.got >= b.cap ? " full" : "")}>
              {r(b.got)} <em>/ {b.cap}</em>
            </span>
          </div>
          <div className="track">
            <div className="fill" style={{ width: `${Math.min(100, (b.got / b.cap) * 100)}%` }} />
          </div>
          {b.sub && (
            <div className="subs">
              {b.sub.map((s) => (
                <span key={s.label} className={"chip" + (s.got < s.min ? " short" : "")}>
                  {s.label} {r(s.got)} / {s.min} 起
                </span>
              ))}
            </div>
          )}
          {(b.in.length > 0 || b.out.length > 0) && (
            <div className="flows">
              {b.in.map((f, i) => <span className="flow in" key={"i" + i}>收到 {r(f.n)}　←　{f.from}</span>)}
              {b.out.map((f, i) => (
                <span className={"flow out" + (f.capped ? " capped" : "") + (f.dropped ? " dropped" : "")} key={"o" + i}>
                  溢流 {r(f.n)}　→　{f.to}{f.capped ? `（上限 ${rules.coreIntoFreeCap} 學分）` : ""}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}

      {result.notes.length > 0 && (
        <div className="notes">
          {result.notes.map((n, i) => <p className={"note " + n.t} key={i}>{n.m}</p>)}
        </div>
      )}

      <button className="link" onClick={() => setShowRules((s) => !s)}>
        {showRules ? "收起" : "這個工具用了哪些規則"}
      </button>
      {showRules && (
        <ul className="rulelist">
          <li>基礎科學 14 ＝ 微積分 8 ＋ 物理／普生／化學三選一 6。修物理(一)(二) 共 8 學分者，超出的 2 學分溢流至自由選修，不受 4 學分上限。</li>
          <li>學程選修超修 → 專業選修；專業選修超修 → 自由選修。這兩段不設額外上限。</li>
          <li>核心課程至少 18（基本素養 ≥6、領域 ≥8，其餘 4 自由分配）。資訊學院對四大領域不予限制。</li>
          <li>語言與溝通至少 6（英文必修 4）。兩類合計可超過 6，超過部分不可轉換為核心學分。</li>
          <li>通識（核心課程）超修進入自由選修以 {rules.coreIntoFreeCap} 學分為上限；語言與溝通超修不受此限，可全數計入自由選修。</li>
          <li>自由選修不採計體育、服務學習、軍訓、護理。</li>
          <li>共掛課程不得兩計：一門課只會落在一個桶位。</li>
        </ul>
      )}
    </section>
  );
}
