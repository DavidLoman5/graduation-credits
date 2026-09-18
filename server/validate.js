/**
 * PUT /api/data 的資料驗證。
 * 只檢查形狀與大小，不套用前端的學分規則（那是前端的事）。
 * 回傳 { ok: true, data } 或 { ok: false, error }。
 */

const LIMITS = {
  courses: 500,
  name: 200,
  cat: 20,
  id: 32,
  term: 10,
  gates: 200,
  gateKey: 40,
  target: 20,
};

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const isStr = (v, max) => typeof v === "string" && v.length <= max;

export function validateData(data) {
  if (!isObj(data)) return { ok: false, error: "data 必須是物件" };

  const year = Number(data.year);
  if (!Number.isInteger(year) || year < 100 || year > 999) return { ok: false, error: "year 必須是三位數學年度" };

  if (!Array.isArray(data.courses)) return { ok: false, error: "courses 必須是陣列" };
  if (data.courses.length > LIMITS.courses) return { ok: false, error: `courses 最多 ${LIMITS.courses} 筆` };
  const courses = [];
  for (const [i, c] of data.courses.entries()) {
    if (!isObj(c)) return { ok: false, error: `courses[${i}] 必須是物件` };
    if (!isStr(c.name, LIMITS.name)) return { ok: false, error: `courses[${i}].name 不正確` };
    const credits = Number(c.credits);
    if (!Number.isFinite(credits) || credits < 0 || credits > 99) return { ok: false, error: `courses[${i}].credits 不正確` };
    if (!isStr(c.cat, LIMITS.cat)) return { ok: false, error: `courses[${i}].cat 不正確` };
    if (c.id !== undefined && !isStr(c.id, LIMITS.id)) return { ok: false, error: `courses[${i}].id 不正確` };
    if (c.eng !== undefined && typeof c.eng !== "boolean") return { ok: false, error: `courses[${i}].eng 不正確` };
    if (c.term !== undefined && !isStr(c.term, LIMITS.term)) return { ok: false, error: `courses[${i}].term 不正確` };
    courses.push({ id: c.id, name: c.name, credits, cat: c.cat, eng: c.eng ?? false, term: c.term ?? "" });
  }

  const gates = {};
  if (data.gates !== undefined) {
    if (!isObj(data.gates)) return { ok: false, error: "gates 必須是物件" };
    const entries = Object.entries(data.gates);
    if (entries.length > LIMITS.gates) return { ok: false, error: `gates 最多 ${LIMITS.gates} 項` };
    for (const [k, v] of entries) {
      if (!isStr(k, LIMITS.gateKey) || typeof v !== "boolean") return { ok: false, error: `gates.${k} 不正確` };
      gates[k] = v;
    }
  }

  let target = "auto";
  if (data.target !== undefined) {
    if (!isStr(data.target, LIMITS.target) || !data.target) return { ok: false, error: "target 不正確" };
    target = data.target;
  }

  return { ok: true, data: { year, courses, gates, target } };
}
