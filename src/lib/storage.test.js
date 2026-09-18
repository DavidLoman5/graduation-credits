import { describe, it, expect } from "vitest";
import { normalizeData } from "./storage.js";

describe("normalizeData", () => {
  it("空值回傳預設資料", () => {
    const d = { year: 114, courses: [], gates: {}, target: "auto" };
    expect(normalizeData(null)).toEqual(d);
    expect(normalizeData(undefined)).toEqual(d);
    expect(normalizeData("junk")).toEqual(d);
    expect(normalizeData({})).toEqual(d);
  });

  it("學年度不在規則表內時退回預設", () => {
    expect(normalizeData({ year: 999 }).year).toBe(114);
    expect(normalizeData({ year: "abc" }).year).toBe(114);
    expect(normalizeData({ year: "115" }).year).toBe(115);
    expect(normalizeData({ year: 115 }).year).toBe(115);
  });

  it("課程：補 id、學分轉數字、無效分類改 unknown、eng 轉 boolean", () => {
    const { courses } = normalizeData({ courses: [
      { name: "離散數學", credits: "3", cat: "required", eng: 1 },
      { name: 123, credits: "abc", cat: "nope" },
      { id: "keep", name: "機率", credits: 3, cat: "required" },
    ] });
    expect(courses).toHaveLength(3);
    expect(courses[0]).toMatchObject({ name: "離散數學", credits: 3, cat: "required", eng: true });
    expect(typeof courses[0].id).toBe("string");
    expect(courses[0].id).not.toBe("");
    expect(courses[1]).toMatchObject({ name: "123", credits: 0, cat: "unknown", eng: false });
    expect(courses[2].id).toBe("keep");
  });

  it("課程陣列中的非物件會被過濾", () => {
    const { courses } = normalizeData({ courses: [null, "x", 5, { name: "a", credits: 1, cat: "free" }] });
    expect(courses).toHaveLength(1);
    expect(normalizeData({ courses: "not array" }).courses).toEqual([]);
  });

  it("gates 只保留 boolean 值", () => {
    expect(normalizeData({ gates: { "114:pe": true, "114:x": "yes", "114:y": 1 } }).gates).toEqual({ "114:pe": true });
    expect(normalizeData({ gates: "bad" }).gates).toEqual({});
  });

  it("target 必須是非空字串", () => {
    expect(normalizeData({ target: "ai" }).target).toBe("ai");
    expect(normalizeData({ target: "" }).target).toBe("auto");
    expect(normalizeData({ target: 5 }).target).toBe("auto");
  });
});
