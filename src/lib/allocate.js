import { r } from "./util.js";

/* ================================================================== *
 * 分配引擎：把課程學分依規則放進桶位，處理溢流與上限
 * ================================================================== */

export function allocate(courses, rules) {
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
