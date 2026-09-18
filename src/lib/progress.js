import { PROGRAMS } from "../data/programs.js";
import { norm } from "./util.js";

/**
 * 主題學程進度。每個學程回傳：
 * - rows：各組課程與命中的課名
 * - capstoneGot：總整課程是否命中
 * - need / doneCount / done：需要幾門、已修幾門、是否完成
 * 「N 選 M」型（pick）的學程沒有總整課程，只算 rows。
 */
export function programProgress(courses) {
  const taken = new Set(courses.map((c) => norm(c.name)));
  const hit = (group) => group.find((n) => taken.has(norm(n))) || null;

  return PROGRAMS.map((p) => {
    const rows = p.groups.map((g) => ({ group: g, got: hit(g) }));
    const capstoneGot = p.capstone ? hit(p.capstone) : null;
    const rowsGot = rows.filter((x) => x.got).length;
    const need = p.pick ?? p.groups.length + 1;
    const doneCount = p.pick ? rowsGot : rowsGot + (capstoneGot ? 1 : 0);
    return { ...p, rows, capstoneGot, need, doneCount, done: doneCount >= need };
  });
}
