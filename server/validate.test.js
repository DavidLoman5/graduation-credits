import { describe, it, expect } from "vitest";
import { validateData } from "./validate.js";

const good = () => ({
  year: 114,
  courses: [{ id: "abc1234", name: "離散數學", credits: 3, cat: "required", eng: false, term: "114-1" }],
  gates: { "114:pe": true },
  target: "auto",
});

describe("validateData", () => {
  it("正常資料通過並回傳整理後的形狀", () => {
    const r = validateData(good());
    expect(r.ok).toBe(true);
    expect(r.data).toEqual(good());
  });

  it("gates、target、eng、id、term 可省略", () => {
    const r = validateData({ year: 115, courses: [{ name: "a", credits: 2, cat: "free" }] });
    expect(r.ok).toBe(true);
    expect(r.data).toEqual({ year: 115, courses: [{ id: undefined, name: "a", credits: 2, cat: "free", eng: false, term: "" }], gates: {}, target: "auto" });
  });

  it("term 必須是短字串", () => {
    const withCourse = (c) => validateData({ ...good(), courses: [c] });
    expect(withCourse({ name: "a", credits: 3, cat: "x", term: 5 }).ok).toBe(false);
    expect(withCourse({ name: "a", credits: 3, cat: "x", term: "x".repeat(11) }).ok).toBe(false);
    expect(withCourse({ name: "a", credits: 3, cat: "x", term: "TR" }).ok).toBe(true);
  });

  it("非物件、缺 courses、year 不合法都拒絕", () => {
    expect(validateData(null).ok).toBe(false);
    expect(validateData([]).ok).toBe(false);
    expect(validateData({ year: 114 }).ok).toBe(false);
    expect(validateData({ ...good(), year: "abc" }).ok).toBe(false);
    expect(validateData({ ...good(), year: 20 }).ok).toBe(false);
  });

  it("課程欄位型別與長度", () => {
    const withCourse = (c) => validateData({ ...good(), courses: [c] });
    expect(withCourse({ name: 5, credits: 3, cat: "x" }).ok).toBe(false);
    expect(withCourse({ name: "a".repeat(201), credits: 3, cat: "x" }).ok).toBe(false);
    expect(withCourse({ name: "a", credits: "abc", cat: "x" }).ok).toBe(false);
    expect(withCourse({ name: "a", credits: -1, cat: "x" }).ok).toBe(false);
    expect(withCourse({ name: "a", credits: 3, cat: 7 }).ok).toBe(false);
    expect(withCourse({ name: "a", credits: 3, cat: "x", eng: "yes" }).ok).toBe(false);
    expect(withCourse({ name: "a", credits: 3, cat: "x", id: "z".repeat(33) }).ok).toBe(false);
    expect(withCourse("string").ok).toBe(false);
  });

  it("課程數量上限", () => {
    const many = Array.from({ length: 501 }, () => ({ name: "a", credits: 1, cat: "free" }));
    expect(validateData({ ...good(), courses: many }).ok).toBe(false);
    expect(validateData({ ...good(), courses: many.slice(0, 500) }).ok).toBe(true);
  });

  it("gates 只接受 boolean 值", () => {
    expect(validateData({ ...good(), gates: { a: "yes" } }).ok).toBe(false);
    expect(validateData({ ...good(), gates: [] }).ok).toBe(false);
  });

  it("target 必須是非空短字串", () => {
    expect(validateData({ ...good(), target: "" }).ok).toBe(false);
    expect(validateData({ ...good(), target: 5 }).ok).toBe(false);
    expect(validateData({ ...good(), target: "ai" }).data.target).toBe("ai");
  });

  it("錯誤訊息指出是哪個欄位", () => {
    expect(validateData({ ...good(), courses: [{ name: "a", credits: "x", cat: "y" }] }).error).toContain("courses[0].credits");
  });
});
