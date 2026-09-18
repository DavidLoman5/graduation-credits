import { describe, it, expect } from "vitest";
import { norm, r, termLabel, termSort, groupByTerm, sumCredits } from "./util.js";

describe("norm", () => {
  it("去空白、全形轉半形、大寫", () => {
    expect(norm(" 微積分 （一） ")).toBe("微積分(一)");
    expect(norm("ＵＮＩＸ程式")).toBe("UNIX程式");
    expect(norm("unix")).toBe("UNIX");
    expect(norm(null)).toBe("");
  });
});

describe("r", () => {
  it("四捨五入到小數一位", () => {
    expect(r(3)).toBe("3");
    expect(r(2.25)).toBe("2.3");
    expect(r(0.04)).toBe("0");
  });
});

describe("termLabel", () => {
  it("三種 term 都有中文標籤", () => {
    expect(termLabel("114-1")).toBe("114 學年度第 1 學期");
    expect(termLabel("TR")).toBe("抵免");
    expect(termLabel("")).toBe("未分學期");
    expect(termLabel(undefined)).toBe("未分學期");
    expect(termLabel("weird")).toBe("weird");
  });
});

describe("termSort", () => {
  it("抵免最前、學期升冪、未分學期最後", () => {
    const terms = ["115-1", "", "114-2", "TR", "114-1"];
    expect([...terms].sort(termSort)).toEqual(["TR", "114-1", "114-2", "115-1", ""]);
  });
});

describe("groupByTerm / sumCredits", () => {
  it("依 term 分組並排序，缺 term 視為未分學期", () => {
    const groups = groupByTerm([
      { name: "a", term: "114-2", credits: 3 },
      { name: "b", term: "TR", credits: 4 },
      { name: "c", credits: "2" },
      { name: "d", term: "114-2", credits: "x" },
    ]);
    expect(groups.map((g) => g.term)).toEqual(["TR", "114-2", ""]);
    expect(groups[1].items.map((c) => c.name)).toEqual(["a", "d"]);
    expect(sumCredits(groups[1].items)).toBe(3);
    expect(sumCredits(groups[2].items)).toBe(2);
  });
});
