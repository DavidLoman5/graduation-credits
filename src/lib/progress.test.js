import { describe, it, expect } from "vitest";
import { programProgress } from "./progress.js";

const courses = (...names) => names.map((name, i) => ({ id: String(i), name, credits: 3, cat: "program" }));
const find = (list, id) => list.find((p) => p.id === id);

describe("programProgress", () => {
  it("沒修課時每個學程都是 0", () => {
    const progs = programProgress([]);
    expect(progs.every((p) => p.doneCount === 0 && !p.done)).toBe(true);
  });

  it("三門課加總整課程才算完成", () => {
    const three = programProgress(courses("資料庫系統概論", "機器學習概論", "人工智慧概論"));
    expect(find(three, "ai")).toMatchObject({ need: 4, doneCount: 3, done: false, capstoneGot: null });

    const four = programProgress(courses("資料庫系統概論", "機器學習概論", "人工智慧概論", "人工智慧總整與實作"));
    expect(find(four, "ai")).toMatchObject({ need: 4, doneCount: 4, done: true, capstoneGot: "人工智慧總整與實作" });
  });

  it("同一組內的替代課名可互相取代", () => {
    const progs = programProgress(courses("計算機網路概論", "密碼工程", "網路程式設計概論", "電腦安全總整與實作"));
    const sec = find(progs, "sec");
    expect(sec.done).toBe(true);
    expect(sec.rows[1].got).toBe("密碼工程");
  });

  it("計算理論是十選四，沒有總整課程", () => {
    const three = find(programProgress(courses("組合數學", "數值方法", "正規語言概論")), "th");
    expect(three).toMatchObject({ need: 4, doneCount: 3, done: false });

    const four = find(programProgress(courses("組合數學", "數值方法", "正規語言概論", "隨機演算法")), "th");
    expect(four).toMatchObject({ need: 4, doneCount: 4, done: true });
  });

  it("課名比對忽略空白與全形字元", () => {
    const progs = programProgress(courses("資料庫系統概論 ", "競技程式設計（一）"));
    expect(find(progs, "ai").rows[0].got).toBe("資料庫系統概論");
    expect(find(progs, "th").doneCount).toBe(1);
  });

  it("一門課可同時算進多個學程", () => {
    const progs = programProgress(courses("計算機網路概論"));
    expect(find(progs, "sec").doneCount).toBe(1);
    expect(find(progs, "net").doneCount).toBe(1);
  });
});
