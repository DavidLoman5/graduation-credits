import { useState, useEffect, useMemo } from "react";
import "./App.css";
import { RULES } from "./data/rules.js";
import { allocate } from "./lib/allocate.js";
import { programProgress } from "./lib/progress.js";
import { loadSaved, persist, normalizeData } from "./lib/storage.js";
import { useCloudSync } from "./useCloudSync.js";
import AuthBar from "./components/AuthBar.jsx";
import Hero from "./components/Hero.jsx";
import Buckets from "./components/Buckets.jsx";
import ProgramPanel from "./components/ProgramPanel.jsx";
import GatesPanel from "./components/GatesPanel.jsx";
import CoursesPanel from "./components/CoursesPanel.jsx";
import DataBar from "./components/DataBar.jsx";
import ConflictDialog from "./components/ConflictDialog.jsx";

export default function App() {
  const saved = useMemo(loadSaved, []);
  const [year, setYear] = useState(saved.year);
  const [courses, setCourses] = useState(saved.courses);
  const [gates, setGates] = useState(saved.gates);
  const [target, setTarget] = useState(saved.target);

  const rules = RULES[year];
  const data = { year, courses, gates, target };

  useEffect(() => { persist({ year, courses, gates, target }); }, [year, courses, gates, target]);

  const applyData = (raw) => {
    const d = normalizeData(raw);
    setYear(d.year);
    setCourses(d.courses);
    setGates(d.gates);
    setTarget(d.target);
  };

  const cloud = useCloudSync(data, applyData);

  // 從成績單匯入：加入課程，並套用抬頭讀到的入學學年度與「學術倫理通過」
  const importCourses = (rows, meta) => {
    setCourses((cs) => [...cs, ...rows]);
    const nextYear = meta.entryYear && RULES[meta.entryYear] ? meta.entryYear : year;
    if (nextYear !== year) setYear(nextYear);
    if (meta.ethics) setGates((x) => ({ ...x, [`${nextYear}:ethics`]: true }));
  };

  const result = useMemo(() => allocate(courses, rules), [courses, rules]);
  const progs = useMemo(() => programProgress(courses), [courses]);

  const ranked = [...progs].sort((a, b) => b.doneCount - a.doneCount);
  const shown = target === "auto" ? ranked[0] : progs.find((p) => p.id === target) || ranked[0];

  const engCandidates = courses.filter(
    (c) => c.eng && ["required", "prof", "program"].includes(c.cat) && !/專題|研討/.test(c.name)
  );
  const doneProgs = progs.filter((p) => p.done);
  const peCount = courses.filter((c) => /體育/.test(c.name)).length;
  const mentorHit = courses.some((c) => /導師時間/.test(c.name));

  // 能從課程清單自動判定的門檻，以及顯示給使用者看的說明
  const auto = {
    eng: { done: engCandidates.length > 0, note: `已偵測到：${engCandidates.map((c) => c.name).join("、")}` },
    topic: { done: doneProgs.length > 0, note: `已完成：${doneProgs.map((p) => p.name).join("、")}` },
    mentor: { done: mentorHit, note: "已偵測到：生涯規劃及導師時間" },
    pe: { done: peCount >= 6, note: `成績單上有 ${peCount} 學期`, progress: peCount > 0 ? `成績單上有 ${peCount} / 6 學期` : null },
  };

  const gateList = rules.gates.map((g) => {
    const manual = !!gates[`${year}:${g.id}`];
    const a = g.auto ? auto[g.auto] : null;
    const satisfiedAuto = !!a?.done;
    return { ...g, done: satisfiedAuto || manual, satisfiedAuto, autoNote: a?.note, progressNote: a?.progress };
  });
  const activeGates = gateList.filter((g) => g.on);
  const gatesDone = activeGates.filter((g) => g.done).length;
  const remaining = Math.max(0, rules.total - result.total);

  return (
    <div className="app">
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

      <Hero result={result} rules={rules} remaining={remaining}
        gatesDone={gatesDone} gatesTotal={activeGates.length} />

      <main className="grid">
        <div className="col">
          <Buckets result={result} rules={rules} />
        </div>
        <div className="col">
          <ProgramPanel ranked={ranked} shown={shown} target={target} setTarget={setTarget} />
          <GatesPanel gateList={gateList} year={year} setGates={setGates} />
          <CoursesPanel courses={courses} setCourses={setCourses} year={year} onImport={importCourses} />
        </div>
      </main>

      <DataBar data={data} year={year} onImport={applyData} />

      {cloud.conflict && (
        <ConflictDialog
          cloudCount={cloud.conflict.cloud.courses?.length ?? 0}
          localCount={courses.length}
          onResolve={cloud.resolveConflict}
        />
      )}

      <footer className="foot">
        依 114 學年度資工系課程架構表、共同課程通則（112–114 學年度入學適用）、核心課程修習辦法（115.06.15 核備）編寫。實際採計以系辦與註冊組認定為準。
      </footer>
    </div>
  );
}
