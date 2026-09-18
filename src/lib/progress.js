import { PROGRAMS } from "../data/programs.js";
import { norm } from "./util.js";

/** 主題學程進度：每個學程的完成狀況 */
export function programProgress(courses) {
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
