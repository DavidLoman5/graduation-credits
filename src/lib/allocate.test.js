import { describe, it, expect } from "vitest";
import { allocate } from "./allocate.js";
import { RULES } from "../data/rules.js";

const rules = RULES[114];
const c = (cat, credits, name = cat) => ({ id: name, name, cat, credits });
const bucket = (res, key) => res.buckets.find((b) => b.key === key);
const noteText = (res) => res.notes.map((n) => n.m).join("\n");

describe("allocate", () => {
  it("沒有課程時總計 0，提示基本素養與領域不足", () => {
    const res = allocate([], rules);
    expect(res.total).toBe(0);
    expect(noteText(res)).toContain("基本素養還差 6");
    expect(noteText(res)).toContain("領域課程還差 8");
  });

  it("學程選修超修 → 專業選修 → 自由選修，不設額外上限", () => {
    const res = allocate([c("program", 18), c("prof", 30)], rules);
    expect(bucket(res, "program").got).toBe(12);
    expect(bucket(res, "program").out).toEqual([{ to: "專業選修", n: 6 }]);
    expect(bucket(res, "prof").got).toBe(30);
    expect(bucket(res, "prof").in).toEqual([{ from: "學程選修", n: 6 }]);
    expect(bucket(res, "prof").out).toEqual([{ to: "自由選修", n: 6 }]);
    expect(bucket(res, "free").got).toBe(6);
    expect(bucket(res, "free").in).toEqual([{ from: "專業選修", n: 6 }]);
    expect(res.total).toBe(12 + 30 + 6);
  });

  it("基礎科學超出 14 的部分溢流到自由選修", () => {
    const res = allocate([c("basic", 8, "微積分"), c("basic", 8, "物理")], rules);
    expect(bucket(res, "basic").got).toBe(14);
    expect(bucket(res, "basic").out).toEqual([{ to: "自由選修", n: 2 }]);
    expect(bucket(res, "free").got).toBe(2);
  });

  it("核心超修進自由選修以 4 學分為限，其餘未採計", () => {
    const res = allocate([c("literacy", 6), c("domain", 18)], rules);
    const core = bucket(res, "core");
    expect(core.got).toBe(18);
    expect(core.out).toEqual([
      { to: "自由選修", n: 4, capped: true },
      { to: "未採計", n: 2, dropped: true },
    ]);
    expect(bucket(res, "free").got).toBe(4);
    expect(noteText(res)).toContain("通識超修有 2 學分未採計");
  });

  it("核心超修不超過 4 時沒有未採計", () => {
    const res = allocate([c("literacy", 6), c("domain", 15)], rules);
    expect(bucket(res, "core").out).toEqual([{ to: "自由選修", n: 3, capped: true }]);
    expect(noteText(res)).not.toContain("未採計");
  });

  it("語言與溝通超修全數進自由選修，不受 4 學分上限", () => {
    const res = allocate([c("lang", 12)], rules);
    expect(bucket(res, "lang").got).toBe(6);
    expect(bucket(res, "lang").out).toEqual([{ to: "自由選修", n: 6 }]);
    expect(bucket(res, "free").got).toBe(6);
    expect(noteText(res)).not.toContain("未採計");
  });

  it("自由選修滿了之後多出的學分無處可去", () => {
    const res = allocate([c("free", 20)], rules);
    expect(bucket(res, "free").got).toBe(17);
    expect(bucket(res, "free").out).toEqual([{ to: "無處可去", n: 3 }]);
    expect(noteText(res)).toContain("多出的 3 學分無法計入");
  });

  it("必修超過 31 轉列專業選修並提示確認", () => {
    const res = allocate([c("required", 34)], rules);
    expect(bucket(res, "required").got).toBe(31);
    expect(bucket(res, "prof").in).toEqual([{ from: "必修", n: 3 }]);
    expect(noteText(res)).toContain("必修超過 31 學分，多出的 3");
  });

  it("核心桶位顯示基本素養與領域的子項下限", () => {
    const res = allocate([c("literacy", 4), c("domain", 8)], rules);
    expect(bucket(res, "core").sub).toEqual([
      { label: "基本素養", got: 4, min: 6 },
      { label: "領域課程", got: 8, min: 8 },
    ]);
  });

  it("未分類與不採計的課不計入任何桶位", () => {
    const res = allocate([c("unknown", 3), c("excluded", 2)], rules);
    expect(res.total).toBe(0);
    expect(noteText(res)).toContain("有 1 門課尚未分類");
  });

  it("學分為字串或壞值時當 0 處理", () => {
    const res = allocate([{ ...c("prof", 3), credits: "3" }, { ...c("prof", 3), credits: "x" }], rules);
    expect(bucket(res, "prof").got).toBe(3);
  });

  it("115 學年度顯示全球視野提示", () => {
    const res = allocate([], RULES[115]);
    expect(res.notes.some((n) => n.t === "info" && n.m.includes("全球視野"))).toBe(true);
    expect(allocate([], rules).notes.some((n) => n.t === "info")).toBe(false);
  });

  it("整合案例：典型大二成績", () => {
    const res = allocate([
      c("basic", 16), c("required", 12), c("program", 15), c("prof", 3),
      c("domain", 4), c("lang", 10), c("excluded", 0),
    ], rules);
    // 14 + 12 + 12 + (3+3) + 4 + 6 + (2+4)
    expect(res.total).toBe(60);
  });
});
