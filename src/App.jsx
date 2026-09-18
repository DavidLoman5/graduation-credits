import { useState, useEffect, useMemo } from "react";
import "./App.css";
import { RULES, DEFAULT_YEAR } from "./data/rules.js";
import { allocate } from "./lib/allocate.js";
import { programProgress } from "./lib/progress.js";
import { loadSaved, persist } from "./lib/storage.js";
import { useCloudSync } from "./useCloudSync.js";
import AuthBar from "./components/AuthBar.jsx";
import Hero from "./components/Hero.jsx";
import Buckets from "./components/Buckets.jsx";
import ProgramPanel from "./components/ProgramPanel.jsx";
import GatesPanel from "./components/GatesPanel.jsx";
import CoursesPanel from "./components/CoursesPanel.jsx";
import DataBar from "./components/DataBar.jsx";

export default function App() {
  const saved = useMemo(loadSaved, []);
  const [year, setYear] = useState(saved.year ?? DEFAULT_YEAR);
  const [courses, setCourses] = useState(Array.isArray(saved.courses) ? saved.courses : []);
  const [gates, setGates] = useState(saved.gates ?? {});
  const [target, setTarget] = useState(saved.target ?? "auto");

  const rules = RULES[year];
  const data = { year, courses, gates, target };

  useEffect(() => { persist({ year, courses, gates, target }); }, [year, courses, gates, target]);

  const applyData = (d) => {
    if (d.year) setYear(d.year);
    if (Array.isArray(d.courses)) setCourses(d.courses);
    if (d.gates) setGates(d.gates);
    if (d.target) setTarget(d.target);
  };

  const cloud = useCloudSync(data, applyData);

  const result = useMemo(() => allocate(courses, rules), [courses, rules]);
  const progs = useMemo(() => programProgress(courses), [courses]);

  const ranked = [...progs].sort((a, b) => b.doneCount - a.doneCount);
  const shown = target === "auto" ? ranked[0] : progs.find((p) => p.id === target) || ranked[0];

  const engCandidates = courses.filter(
    (c) => c.eng && ["required", "prof", "program"].includes(c.cat) && !/專題|研討/.test(c.name)
  );
  const doneProgs = progs.filter((p) => p.done);
  const autoState = { eng: engCandidates.length > 0, topic: doneProgs.length > 0 };

  const gateList = rules.gates.map((g) => {
    const manual = !!gates[`${year}:${g.id}`];
    const satisfiedAuto = g.auto ? !!autoState[g.auto] : false;
    return { ...g, done: satisfiedAuto || manual, satisfiedAuto };
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

      <div className="grid">
        <div className="col">
          <Buckets result={result} />
        </div>
        <div className="col">
          <ProgramPanel ranked={ranked} shown={shown} target={target} setTarget={setTarget} />
          <GatesPanel gateList={gateList} year={year} setGates={setGates}
            engCandidates={engCandidates} doneProgs={doneProgs} />
          <CoursesPanel courses={courses} setCourses={setCourses} />
        </div>
      </div>

      <DataBar data={data} year={year} onImport={applyData} />

      <footer className="foot">
        依 114 學年度資工系課程架構表、共同課程通則（112–114 學年度入學適用）、核心課程修習辦法（115.06.15 核備）編寫。實際採計以系辦與註冊組認定為準。
      </footer>
    </div>
  );
}
