import React, { useState, useEffect, useMemo } from "react";
import AuthBar from "./AuthBar.jsx";
import { useCloudSync } from "./useCloudSync.js";

/* ================================================================== *
 * 規則表：以「入學學年度」為 key
 * ================================================================== */

const RULES = {
  114: {
    label: "114 學年度入學 · 資工系乙組",
    total: 128,
    caps: { basic: 14, required: 31, program: 12, prof: 30, free: 17, core: 18, lang: 6 },
    mins: { literacy: 6, domain: 8 },
    coreIntoFreeCap: 4,
    globalView: false,
    gates: [
      { id: "gpe", label: "通過程式能力鑑定", note: "「基礎程式設計」及格條件", on: true },
      { id: "eng", label: "1 門本系英文授課專業課程", note: "專題、研討類型除外", on: true, auto: "eng" },
      { id: "topic", label: "完成七大主題學程其中 1 個", note: "乙組必要", on: true, auto: "topic" },
      { id: "pe", label: "體育 6 學期", note: "0 學分", on: true },
      { id: "ethics", label: "學生學術及研究倫理教育課程", note: "", on: true },
      { id: "gender", label: "性別平等教育線上課程", note: "", on: true },
      { id: "mentor", label: "導師時間", note: "", on: true },
      { id: "service", label: "服務學習（一）（二）", note: "114 學年度前入學由學系自行規定；資工系不要求", on: false },
    ],
  },
  115: {
    label: "115 學年度入學 · 資工系乙組",
    total: 128,
    caps: { basic: 14, required: 31, program: 12, prof: 30, free: 17, core: 18, lang: 6 },
    mins: { literacy: 6, domain: 8 },
    coreIntoFreeCap: 4,
    globalView: true,
    gates: [
      { id: "gpe", label: "通過程式能力鑑定", note: "「基礎程式設計」及格條件", on: true },
      { id: "eng", label: "1 門本系英文授課專業課程", note: "專題、研討類型除外", on: true, auto: "eng" },
      { id: "topic", label: "完成七大主題學程其中 1 個", note: "", on: true, auto: "topic" },
      { id: "pe", label: "體育 6 學期", note: "0 學分", on: true },
      { id: "ethics", label: "學生學術及研究倫理教育課程", note: "", on: true },
      { id: "gender", label: "性別平等教育線上課程", note: "", on: true },
      { id: "mentor", label: "導師時間", note: "", on: true },
      { id: "service", label: "服務學習", note: "115 學年度起由學系自行規定，請向系辦確認", on: false },
    ],
  },
};

const CATS = [
  ["basic", "基礎科學"],
  ["required", "必修"],
  ["program", "學程選修"],
  ["prof", "專業選修"],
  ["free", "自由選修"],
  ["literacy", "核心－基本素養"],
  ["domain", "核心－領域"],
  ["lang", "語言與溝通"],
  ["excluded", "不採計"],
  ["unknown", "未分類"],
];

/* 七大主題學程：每個位置是一組「可互相替代」的課名 */
const PROGRAMS = [
  { id: "ai", name: "人工智慧與數據科學",
    groups: [["資料庫系統概論"], ["機器學習概論"], ["人工智慧概論"]],
    capstone: ["人工智慧總整與實作"] },
  { id: "sec", name: "資訊安全",
    groups: [["計算機網路概論"], ["密碼學概論", "密碼工程"], ["網路程式設計概論"]],
    capstone: ["電腦安全總整與實作"] },
  { id: "mm", name: "多媒體工程",
    groups: [["計算機圖學概論"], ["影像處理概論"], ["數值方法"]],
    capstone: ["多媒體與人機互動總整與實作"] },
  { id: "net", name: "網路工程",
    groups: [["計算機網路概論"], ["網路程式設計概論"], ["通訊原理與無線網路"]],
    capstone: ["網路系統總整與實作"] },
  { id: "sys", name: "系統軟體",
    groups: [["計算機系統管理"], ["編譯器設計概論"], ["高等UNIX程式設計"]],
    capstone: ["作業系統總整與實作"] },
  { id: "hw", name: "軟硬體整合",
    groups: [["數位電路實驗"], ["編譯器設計概論"], ["微處理機系統原理與實作"]],
    capstone: ["嵌入式系統總整與實作"] },
  { id: "th", name: "計算理論",
    pick: 4,
    groups: [
      ["組合數學"], ["人工智慧概論"], ["數值方法"], ["正規語言概論"],
      ["競技程式設計(一)"], ["圖形理論", "圖形理論概論"], ["隨機演算法"],
      ["近似演算法"], ["資訊理論與壓縮編碼的應用"], ["機器學習演算法理論基礎"],
    ],
    capstone: null },
];

/* 課程目錄：貼上匯入時用來判斷「必」到底是基礎科學還是系必修 */
const CATALOG = {};
const addCat = (cat, names, credits) => names.forEach((n) => (CATALOG[norm(n)] = { cat, credits }));

addCat("basic", ["微積分(一)", "微積分(二)", "物理(一)", "物理(二)"], 4);
addCat("basic", ["普通生物學(一)", "普通生物學(二)", "化學(一)", "化學(二)"], 3);
addCat("required", [
  "線性代數", "計算機概論與程式設計", "資料結構與物件導向程式設計", "離散數學",
  "數位電路設計", "機率", "演算法概論", "計算機組織", "作業系統概論",
], 3);
addCat("required", ["基礎程式設計", "資訊工程研討", "生涯規劃及導師時間"], 0);
addCat("required", ["資訊工程專題(一)", "資訊工程專題(二)"], 2);
PROGRAMS.forEach((p) => {
  p.groups.forEach((g) => addCat("program", g, 3));
  if (p.capstone) addCat("program", p.capstone, 3);
});
addCat("excluded", ["大一體育", "體育", "服務學習(一)", "服務學習(二)", "軍訓", "護理"], 0);

function norm(s) {
  return String(s || "")
    .replace(/\s+/g, "")
    .replace(/（/g, "(").replace(/）/g, ")")
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .toUpperCase();
}

function guess(name) {
  const n = norm(name);
  if (CATALOG[n]) return CATALOG[n];
  for (const key of Object.keys(CATALOG)) {
    if (key.length >= 3 && (n.includes(key) || key.includes(n))) return CATALOG[key];
  }
  if (/英文|ENGLISH|外語|日文|德文|法文|韓文|西班牙文|寫作|溝通與表達|台語|客語/.test(n))
    return { cat: "lang", credits: 2 };
  if (/體育|服務學習|軍訓|護理/.test(n)) return { cat: "excluded", credits: 0 };
  return { cat: "unknown", credits: 3 };
}

/* 成績單「課別」欄 → 桶位 */
const CODE_MAP = {
  必: "required", 選: "prof", 核: "domain", 語: "lang",
  體: "excluded", 服: "excluded", 通: "domain", 自: "free",
  輔: "free", 研: "prof", 軍: "excluded",
};

function parseTranscript(text) {
  const rows = [];
  for (const raw of text.split(/\r?\n/)) {
    let t = raw.replace(/\t/g, "  ").trim();
    if (!t) continue;
    if (/^(課別|科目名稱|修習學分|實得學分|說明|學號|姓名|系所組別|學院|年級|國立陽明|※|GPA)/.test(t)) continue;

    let code = null;
    const cm = t.match(/^([必選核語體服通自輔研軍])\s+/);
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
    name = name.replace(/[#▲§*]+/g, "").trim();
    name = name.replace(/^[A-Za-z0-9\-]{5,}\s+/, "").trim();
    if (!name) continue;
    if (/^(F|W|\*)/.test(grade)) continue; // 不及格或停修不計

    const g = guess(name);
    let cat;
    if (code === "必") cat = g.cat === "basic" || g.cat === "excluded" ? g.cat : "required";
    else if (code === "選") cat = g.cat === "program" ? "program" : "prof";
    else if (code) cat = CODE_MAP[code] || g.cat;
    else cat = g.cat;

    rows.push({
      id: uid(), name,
      credits: credits ?? g.credits,
      cat, eng, keep: true,
      ambiguous: code === "核" || code === "通",
    });
  }
  return rows;
}

/* ================================================================== *
 * 分配引擎
 * ================================================================== */

function allocate(courses, rules) {
  const { caps, coreIntoFreeCap } = rules;
  const sum = (k) => courses.filter((c) => c.cat === k).reduce((a, c) => a + (Number(c.credits) || 0), 0);

  const rawBasic = sum("basic");
  const basic = Math.min(rawBasic, caps.basic);
  const ovBasic = Math.max(0, rawBasic - caps.basic);

  const rawReq = sum("required");
  const required = Math.min(rawReq, caps.required);
  const ovReq = Math.max(0, rawReq - caps.required);

  const rawProg = sum("program");
  const program = Math.min(rawProg, caps.program);
  const ovProg = Math.max(0, rawProg - caps.program);

  const rawProf = sum("prof") + ovProg + ovReq;
  const prof = Math.min(rawProf, caps.prof);
  const ovProf = Math.max(0, rawProf - caps.prof);

  const rawLit = sum("literacy");
  const rawDom = sum("domain");
  const rawCore = rawLit + rawDom;
  const core = Math.min(rawCore, caps.core);
  const ovCore = Math.max(0, rawCore - caps.core);

  const rawLang = sum("lang");
  const lang = Math.min(rawLang, caps.lang);
  const ovLang = Math.max(0, rawLang - caps.lang);

  // 通識超修進自由選修有上限；語言與溝通超修不設限
  const coreIn = Math.min(ovCore, coreIntoFreeCap);
  const coreDropped = ovCore - coreIn;

  const rawFree = sum("free") + ovBasic + ovProf + coreIn + ovLang;
  const free = Math.min(rawFree, caps.free);
  const ovFree = Math.max(0, rawFree - caps.free);

  const buckets = [
    { key: "basic", label: "基礎科學", got: basic, cap: caps.basic,
      out: ovBasic ? [{ to: "自由選修", n: ovBasic }] : [], in: [] },
    { key: "required", label: "必修", got: required, cap: caps.required,
      out: ovReq ? [{ to: "專業選修", n: ovReq }] : [], in: [] },
    { key: "program", label: "學程選修", got: program, cap: caps.program,
      out: ovProg ? [{ to: "專業選修", n: ovProg }] : [], in: [] },
    { key: "prof", label: "專業選修", got: prof, cap: caps.prof,
      out: ovProf ? [{ to: "自由選修", n: ovProf }] : [],
      in: [ovProg && { from: "學程選修", n: ovProg }, ovReq && { from: "必修", n: ovReq }].filter(Boolean) },
    { key: "core", label: "核心課程", got: core, cap: caps.core,
      out: ovCore ? [{ to: "自由選修", n: ovCore, capped: true }] : [], in: [],
      sub: [
        { label: "基本素養", got: rawLit, min: rules.mins.literacy },
        { label: "領域課程", got: rawDom, min: rules.mins.domain },
      ] },
    { key: "lang", label: "語言與溝通", got: lang, cap: caps.lang,
      out: ovLang ? [{ to: "自由選修", n: ovLang }] : [], in: [] },
    { key: "free", label: "自由選修", got: free, cap: caps.free,
      out: ovFree ? [{ to: "無處可去", n: ovFree }] : [],
      in: [
        ovBasic && { from: "基礎科學", n: ovBasic },
        ovProf && { from: "專業選修", n: ovProf },
        coreIn && { from: "核心課程", n: coreIn },
        ovLang && { from: "語言與溝通", n: ovLang },
      ].filter(Boolean) },
  ];

  const total = basic + required + program + prof + core + lang + free;

  const notes = [];
  if (rawLit < rules.mins.literacy)
    notes.push({ t: "warn", m: `基本素養還差 ${r(rules.mins.literacy - rawLit)} 學分（下限 ${rules.mins.literacy}）` });
  if (rawDom < rules.mins.domain)
    notes.push({ t: "warn", m: `領域課程還差 ${r(rules.mins.domain - rawDom)} 學分（下限 ${rules.mins.domain}）。資訊學院對四大領域不予限制` });
  if (coreDropped > 0)
    notes.push({ t: "flag", m: `通識超修有 ${r(coreDropped)} 學分未採計 —— 通識超修進自由選修以 ${coreIntoFreeCap} 學分為限。語言與溝通超修則不受此限，可全數計入自由選修。` });
  if (ovFree > 0)
    notes.push({ t: "flag", m: `自由選修已滿，多出的 ${r(ovFree)} 學分無法計入畢業學分` });
  if (rawReq > caps.required)
    notes.push({ t: "flag", m: `必修超過 ${caps.required} 學分，多出的 ${r(ovReq)} 已轉列專業選修，請確認分類` });
  const unknown = courses.filter((c) => c.cat === "unknown");
  if (unknown.length)
    notes.push({ t: "warn", m: `有 ${unknown.length} 門課尚未分類，未計入任何桶位` });
  if (rules.globalView)
    notes.push({ t: "info", m: "115 學年度起入學：基本素養需含必修「全球視野」2 學分" });

  return { buckets, total, notes };
}

const r = (n) => (Math.round(n * 10) / 10).toString();
const uid = () => Math.random().toString(36).slice(2, 9);

/* 主題學程進度 */
function programProgress(courses) {
  const taken = new Set(courses.map((c) => norm(c.name)));
  const hit = (group) => group.find((n) => taken.has(norm(n))) || null;

  return PROGRAMS.map((p) => {
    const rows = p.groups.map((g) => ({ group: g, got: hit(g) }));
    const capstoneGot = p.capstone ? hit(p.capstone) : null;
    const need = p.pick ? p.pick : p.groups.length + 1;
    const doneCount = rows.filter((x) => x.got).length + (capstoneGot ? 1 : 0);
    const done = p.pick ? rows.filter((x) => x.got).length >= p.pick : doneCount === need;
    return { ...p, rows, capstoneGot, need, doneCount: p.pick ? rows.filter((x) => x.got).length : doneCount, done };
  });
}

/* ================================================================== *
 * 元件
 * ================================================================== */

const STORE_KEY = "nycu-grad-credits-v2";

function loadSaved() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
  } catch {
    return {};
  }
}

export default function App() {
  const saved = useMemo(loadSaved, []);
  const [year, setYear] = useState(saved.year ?? 114);
  const [courses, setCourses] = useState(Array.isArray(saved.courses) ? saved.courses : []);
  const [gates, setGates] = useState(saved.gates ?? {});
  const [target, setTarget] = useState(saved.target ?? "auto");
  const [paste, setPaste] = useState("");
  const [staged, setStaged] = useState(null);
  const [showRules, setShowRules] = useState(false);

  const rules = RULES[year];

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ year, courses, gates, target }));
    } catch { /* 無痕模式或容量已滿，不影響當次使用 */ }
  }, [year, courses, gates, target]);

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify({ year, courses, gates, target }, null, 2)],
      { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `畢業學分-${year}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const applyData = (d) => {
    if (d.year) setYear(d.year);
    if (Array.isArray(d.courses)) setCourses(d.courses);
    if (d.gates) setGates(d.gates);
    if (d.target) setTarget(d.target);
  };

  const cloud = useCloudSync({ year, courses, gates, target }, applyData);

  const importJSON = (file) => {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        applyData(JSON.parse(fr.result));
      } catch {
        alert("這個檔案讀不出來，請確認是本工具匯出的 JSON。");
      }
    };
    fr.readAsText(file);
  };

  const result = useMemo(() => allocate(courses, rules), [courses, rules]);
  const progs = useMemo(() => programProgress(courses), [courses]);

  const ranked = [...progs].sort((a, b) => b.doneCount - a.doneCount);
  const shown = target === "auto" ? ranked[0] : progs.find((p) => p.id === target) || ranked[0];

  const engCandidates = courses.filter(
    (c) => c.eng && ["required", "prof", "program"].includes(c.cat) && !/專題|研討/.test(c.name)
  );

  const autoState = { eng: engCandidates.length > 0, topic: progs.some((p) => p.done) };

  const addCourse = () => setCourses((cs) => [...cs, { id: uid(), name: "", credits: 3, cat: "unknown" }]);
  const patch = (id, k, v) => setCourses((cs) => cs.map((c) => (c.id === id ? { ...c, [k]: v } : c)));
  const remove = (id) => setCourses((cs) => cs.filter((c) => c.id !== id));

  const commit = () => {
    setCourses((cs) => [...cs, ...staged.filter((s) => s.keep).map(({ keep, ambiguous, ...c }) => c)]);
    setStaged(null);
    setPaste("");
  };

  const gateList = rules.gates.map((g) => ({
    ...g,
    done: g.auto ? autoState[g.auto] || !!gates[`${year}:${g.id}`] : !!gates[`${year}:${g.id}`],
    satisfiedAuto: g.auto ? autoState[g.auto] : false,
  }));
  const activeGates = gateList.filter((g) => g.on);
  const gatesDone = activeGates.filter((g) => g.done).length;
  const remaining = Math.max(0, rules.total - result.total);

  return (
    <div className="app">
      <style>{CSS}</style>

      <header className="head">
        <div>
          <h1>畢業學分檢核</h1>
          <p className="sub">{rules.label}　·　最低畢業學分 {rules.total}</p>
        </div>
        <div className="headright">
          {cloud.enabled && <AuthBar {...cloud} />}
          <label className="yearpick">
            入學學年度
            <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {Object.keys(RULES).map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
        </div>
      </header>

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
            <span className="gatecount">畢業門檻 {gatesDone} / {activeGates.length}</span>
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

      <div className="grid">
        {/* 左欄 */}
        <div className="col">
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
                      <span className={"flow out" + (f.capped ? " capped" : "")} key={"o" + i}>
                        溢流 {r(f.n)}　→　{f.to}{f.capped ? "（受 4 學分上限）" : ""}
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
                <li>通識與外語超修進入自由選修時，合計以 4 學分為上限（保守解釋，待系辦確認）。</li>
                <li>自由選修不採計體育、服務學習、軍訓、護理。</li>
                <li>共掛課程不得兩計：一門課只會落在一個桶位。</li>
              </ul>
            )}
          </section>
        </div>

        {/* 右欄 */}
        <div className="col">
          <section className="panel">
            <div className="phead">
              <h2>主題學程</h2>
              <select className="psel" value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="auto">自動比對（最接近）</option>
                {PROGRAMS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {shown && (
              <div className="prog">
                <div className="progtop">
                  <span className="progname">{shown.name}</span>
                  <span className={"progcount" + (shown.done ? " ok" : "")}>
                    {shown.doneCount} / {shown.pick ? shown.pick : shown.groups.length + 1}
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
                    <span>{p.doneCount} / {p.pick ? p.pick : p.groups.length + 1}</span>
                  </li>
                ))}
              </ul>
            </details>
          </section>

          <section className="panel">
            <h2>畢業門檻</h2>
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
                      <em className="gatenote auto">已完成：{progs.filter((p) => p.done).map((p) => p.name).join("、")}</em>
                    )}
                    {!g.satisfiedAuto && g.note && <em className="gatenote">{g.note}</em>}
                  </span>
                </label>
                <span className="applies">{g.on ? (g.satisfiedAuto ? "自動" : "適用") : "不適用"}</span>
              </div>
            ))}
          </section>

          <section className="panel">
            <h2>已修課程</h2>

            <details className="importer">
              <summary>從成績通知單貼上</summary>
              <p className="hint">整份貼進來就好，標題列和統計列會自動略過。課別欄（必／選／核／語／體）會用來分類，<code>#</code> 會被讀成英語授課。</p>
              <textarea
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                placeholder={"必  離散數學  3.00  A+\n必  數位電路設計#  3.00  A+\n語  西班牙文(一)  2.00  A+"}
              />
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
                    <input type="checkbox" checked={s.keep}
                      onChange={(e) => setStaged((x) => x.map((y, j) => (j === i ? { ...y, keep: e.target.checked } : y)))} />
                    <input className="sname" value={s.name}
                      onChange={(e) => setStaged((x) => x.map((y, j) => (j === i ? { ...y, name: e.target.value } : y)))} />
                    <input className="scred" type="number" step="0.5" value={s.credits}
                      onChange={(e) => setStaged((x) => x.map((y, j) => (j === i ? { ...y, credits: Number(e.target.value) } : y)))} />
                    <select className={s.cat === "unknown" ? "warnsel" : ""} value={s.cat}
                      onChange={(e) => setStaged((x) => x.map((y, j) => (j === i ? { ...y, cat: e.target.value } : y)))}>
                      {CATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
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
                <input className="cname" value={c.name} placeholder="課程名稱"
                  onChange={(e) => patch(c.id, "name", e.target.value)}
                  onBlur={(e) => {
                    if (c.cat === "unknown" && e.target.value) {
                      const g = guess(e.target.value);
                      if (g.cat !== "unknown") patch(c.id, "cat", g.cat);
                    }
                  }} />
                <input className="ccred" type="number" step="0.5" value={c.credits}
                  onChange={(e) => patch(c.id, "credits", Number(e.target.value))} />
                <select className={c.cat === "unknown" ? "warnsel" : ""} value={c.cat}
                  onChange={(e) => patch(c.id, "cat", e.target.value)}>
                  {CATS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
                <button className={"engbtn" + (c.eng ? " on" : "")} title="英語授課"
                  onClick={() => patch(c.id, "eng", !c.eng)}>#</button>
                <button className="del" onClick={() => remove(c.id)} aria-label="刪除">×</button>
              </div>
            ))}

            <div className="crowbtns">
              <button className="ghost" onClick={addCourse}>新增一門課</button>
              {courses.length > 0 && (
                <button className="ghost danger"
                  onClick={() => { if (confirm("清空所有課程？")) setCourses([]); }}>清空</button>
              )}
            </div>
          </section>
        </div>
      </div>

      <div className="databar">
        <button className="ghost" onClick={exportJSON}>匯出資料</button>
        <label className="ghost filelabel">
          匯入資料
          <input type="file" accept="application/json"
            onChange={(e) => { if (e.target.files[0]) importJSON(e.target.files[0]); e.target.value = ""; }} />
        </label>
        <span className="datahint">資料存在這台裝置的瀏覽器裡，換裝置請用匯出／匯入。</span>
      </div>

      <footer className="foot">
        依 114 學年度資工系課程架構表、共同課程通則（112–114 學年度入學適用）、核心課程修習辦法（115.06.15 核備）編寫。實際採計以系辦與註冊組認定為準。
      </footer>
    </div>
  );
}

const CSS = `
.app{
  --paper:#EBEEF2; --surface:#fff; --ink:#182130; --muted:#6A7585;
  --line:#D6DCE4; --accent:#5B2E8C; --accentSoft:#EDE4F6;
  --flow:#A96410; --flowSoft:#FAEEDC; --ok:#1D7A5C; --warn:#A3221C;
  background:var(--paper); color:var(--ink); padding:28px 20px 48px;
  font-family:"Noto Sans TC","PingFang TC","Microsoft JhengHei",system-ui,sans-serif;
  font-variant-numeric:tabular-nums; line-height:1.6; min-height:100%;
}
.app *{box-sizing:border-box}
.app h1{font-size:26px;font-weight:700;margin:0}
.app h2{font-size:15px;font-weight:700;margin:0 0 14px;letter-spacing:.02em}
.app p{margin:0}
.app code{font-size:12px;background:var(--paper);padding:1px 4px;border-radius:3px}
.sub{color:var(--muted);font-size:13px;margin-top:4px}
.head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;
  max-width:1060px;margin:0 auto 20px;flex-wrap:wrap}
.headright{display:flex;flex-direction:column;align-items:flex-end;gap:8px}
.authbar{display:flex;align-items:center;gap:10px;font-size:13px;min-height:32px}
.who{font-weight:600;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.syncstate{color:var(--muted);font-size:12px}
.syncstate.err{color:var(--warn)}
.linkbtn{font:inherit;font-size:12px;color:var(--accent);background:none;border:none;padding:0;cursor:pointer}
.linkbtn:hover{text-decoration:underline}
.yearpick{font-size:12px;color:var(--muted);display:flex;align-items:center;gap:8px}
.yearpick select{font:inherit;font-size:14px;color:var(--ink);padding:6px 10px;
  border:1px solid var(--line);border-radius:6px;background:var(--surface)}

.hero{max-width:1060px;margin:0 auto 18px;background:var(--surface);
  border:1px solid var(--line);border-radius:10px;padding:20px 22px}
.herotop{display:flex;justify-content:space-between;align-items:baseline;gap:16px;flex-wrap:wrap}
.big{display:flex;align-items:baseline;gap:8px}
.num{font-size:46px;font-weight:700;line-height:1;letter-spacing:-.02em}
.denom{font-size:17px;color:var(--muted)}
.heroright{display:flex;flex-direction:column;align-items:flex-end;gap:2px;font-size:13px}
.still{color:var(--accent);font-weight:600}
.done{color:var(--ok);font-weight:600}
.gatecount{color:var(--muted);font-size:12px}
.segbar{display:flex;gap:3px;margin-top:18px}
.seg{flex-basis:0;min-width:0}
.segtrack{height:9px;background:var(--paper);border-radius:2px;overflow:hidden}
.segfill{height:100%;background:var(--accent);border-radius:2px;
  transition:width .35s cubic-bezier(.4,0,.2,1)}
.seglabel{font-size:10px;color:var(--muted);margin-top:6px;white-space:nowrap;
  overflow:hidden;text-overflow:ellipsis}

.grid{max-width:1060px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:start}
.col{display:flex;flex-direction:column;gap:18px}
.panel{background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:20px 22px}

.bucket{padding:12px 0;border-bottom:1px solid var(--paper)}
.bucket:last-of-type{border-bottom:0}
.brow{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:7px}
.bname{font-size:14px;font-weight:600}
.bnum{font-size:14px;color:var(--muted)}
.bnum.full{color:var(--ok);font-weight:600}
.bnum em{font-style:normal;font-size:12px}
.track{height:6px;background:var(--paper);border-radius:3px;overflow:hidden}
.fill{height:100%;background:var(--accent);border-radius:3px;
  transition:width .35s cubic-bezier(.4,0,.2,1)}
.subs{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.chip{font-size:11px;background:var(--accentSoft);color:var(--accent);padding:2px 8px;border-radius:10px}
.chip.short{background:#FBE9E7;color:var(--warn)}
.flows{display:flex;flex-direction:column;gap:3px;margin-top:8px}
.flow{font-size:11.5px;color:var(--flow);background:var(--flowSoft);
  padding:3px 9px;border-radius:4px;align-self:flex-start}
.flow.in{color:var(--accent);background:var(--accentSoft)}
.flow.capped{border:1px dashed #D9B77E}

.notes{margin-top:16px;display:flex;flex-direction:column;gap:8px}
.note{font-size:12.5px;padding:9px 12px;border-radius:6px;border-left:3px solid}
.note.warn{background:#FBE9E7;border-color:var(--warn);color:#7A1A15}
.note.flag{background:var(--flowSoft);border-color:var(--flow);color:#7A4A0C}
.note.info{background:var(--paper);border-color:var(--line);color:var(--muted)}

.link{background:none;border:0;padding:8px 0 0;font:inherit;font-size:12.5px;
  color:var(--accent);cursor:pointer;text-decoration:underline;text-underline-offset:3px}
.rulelist{margin:10px 0 0;padding-left:18px;font-size:12.5px;color:var(--muted);
  display:flex;flex-direction:column;gap:6px;max-width:62ch}

.phead{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px}
.phead h2{margin:0}
.psel{font:inherit;font-size:12px;padding:5px 8px;border:1px solid var(--line);
  border-radius:6px;background:var(--surface);color:var(--ink);max-width:170px}
.prog{border:1px solid var(--line);border-radius:8px;padding:14px}
.progtop{display:flex;justify-content:space-between;align-items:baseline;gap:10px}
.progname{font-size:15px;font-weight:700}
.progcount{font-size:12.5px;color:var(--muted)}
.progcount.ok{color:var(--ok);font-weight:600}
.steps{list-style:none;margin:12px 0 0;padding:0;display:flex;flex-direction:column;gap:7px}
.steps li{display:flex;gap:9px;font-size:13px;color:var(--muted);align-items:flex-start}
.steps li.got{color:var(--ink)}
.steps li.capstone{padding-top:8px;border-top:1px dashed var(--line);margin-top:2px}
.mark{color:var(--line);flex-shrink:0;width:13px}
.steps li.got .mark{color:var(--ok)}
.tag{font-style:normal;font-size:10.5px;color:var(--flow);background:var(--flowSoft);
  padding:1px 6px;border-radius:8px;margin-left:7px}
.others{margin-top:12px}
.others summary{font-size:12.5px;color:var(--accent);cursor:pointer;padding:4px 0}
.otherlist{list-style:none;margin:6px 0 0;padding:0;font-size:12.5px}
.otherlist li{display:flex;justify-content:space-between;padding:4px 0;color:var(--muted)}
.plink{background:none;border:0;font:inherit;font-size:12.5px;color:var(--ink);
  cursor:pointer;padding:0;text-align:left}
.plink:hover{color:var(--accent)}

.hint{font-size:12.5px;color:var(--muted);margin-bottom:12px;line-height:1.65}
.gate{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;
  padding:9px 0;border-bottom:1px solid var(--paper)}
.gate:last-of-type{border-bottom:0}
.gate.off{opacity:.45}
.gatemain{display:flex;gap:10px;align-items:flex-start;font-size:13.5px;cursor:pointer}
.gate.off .gatemain{cursor:default}
.gatemain input{margin-top:5px;accent-color:var(--accent);width:15px;height:15px;flex-shrink:0}
.gatenote{display:block;font-style:normal;font-size:11.5px;color:var(--muted);margin-top:1px}
.gatenote.auto{color:var(--ok)}
.applies{font-size:11px;color:var(--muted);flex-shrink:0;padding-top:2px}

.importer{margin-bottom:14px}
.importer summary{font-size:13px;color:var(--accent);cursor:pointer;padding:7px 0;
  list-style:none;font-weight:600}
.importer summary::-webkit-details-marker{display:none}
.importer summary::before{content:"＋ ";}
.importer textarea{width:100%;height:120px;font:inherit;font-size:13px;padding:10px;
  border:1px solid var(--line);border-radius:6px;resize:vertical;margin:6px 0 8px;
  background:var(--surface);color:var(--ink)}

.staging{background:var(--paper);border-radius:8px;padding:12px;margin-bottom:14px}
.srow,.crow{display:flex;gap:6px;align-items:center;margin-bottom:6px}
.srow.amb select{border-color:var(--flow);background:var(--flowSoft)}
.srow input[type=checkbox]{accent-color:var(--accent);width:15px;height:15px;flex-shrink:0}
.sname,.cname{flex:1;min-width:0}
.scred,.ccred{width:58px;flex-shrink:0}
.app input[type=text],.app input:not([type]),.sname,.cname,.scred,.ccred,
.app select,.app textarea{font:inherit;font-size:13px;padding:6px 8px;
  border:1px solid var(--line);border-radius:5px;background:var(--surface);color:var(--ink)}
.srow select,.crow select{width:130px;flex-shrink:0}
.warnsel{border-color:var(--warn);color:var(--warn)}
.engbtn{width:26px;flex-shrink:0;border:1px solid var(--line);background:var(--surface);
  color:var(--line);border-radius:5px;font:inherit;font-size:13px;cursor:pointer;padding:5px 0}
.engbtn.on{color:#fff;background:var(--ok);border-color:var(--ok)}
.del{border:0;background:none;color:var(--muted);font-size:19px;line-height:1;
  cursor:pointer;padding:2px 5px;flex-shrink:0}
.del:hover{color:var(--warn)}
.srowbtns,.crowbtns{display:flex;gap:8px;margin-top:10px}
.empty{font-size:13px;color:var(--muted);padding:14px 0}

.primary{font:inherit;font-size:13px;font-weight:600;background:var(--accent);color:#fff;
  border:0;border-radius:6px;padding:8px 16px;cursor:pointer}
.primary:disabled{background:var(--line);color:var(--muted);cursor:default}
.ghost{font:inherit;font-size:13px;background:var(--surface);color:var(--ink);
  border:1px solid var(--line);border-radius:6px;padding:8px 14px;cursor:pointer}
.ghost.danger{color:var(--warn);border-color:#E8C4C1}
.app button:focus-visible,.app input:focus-visible,.app select:focus-visible,
.app textarea:focus-visible,.app summary:focus-visible{outline:2px solid var(--accent);outline-offset:2px}

.databar{max-width:1060px;margin:18px auto 0;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.filelabel{position:relative;overflow:hidden;cursor:pointer;display:inline-block}
.filelabel input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}
.datahint{font-size:11.5px;color:var(--muted)}
.foot{max-width:76ch;margin:22px auto 0;font-size:11.5px;color:var(--muted);line-height:1.7}

@media (max-width:820px){
  .grid{grid-template-columns:1fr}
  .seglabel{display:none}
  .num{font-size:38px}
  .srow select,.crow select{width:102px}
}
@media (prefers-reduced-motion:reduce){
  .segfill,.fill{transition:none}
}
`;
