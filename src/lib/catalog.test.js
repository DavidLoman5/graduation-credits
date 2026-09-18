import { describe, it, expect } from "vitest";
import { guess } from "./catalog.js";

describe("guess", () => {
  it("精確比對目錄", () => {
    expect(guess("離散數學")).toEqual({ cat: "required", credits: 3 });
    expect(guess("微積分(一)")).toEqual({ cat: "basic", credits: 4 });
    expect(guess("機器學習概論")).toEqual({ cat: "program", credits: 3 });
  });

  it("成績單上帶班別的微積分歸基礎科學", () => {
    expect(guess("微積分甲(一)")).toEqual({ cat: "basic", credits: 4 });
    expect(guess("微積分乙(二)")).toEqual({ cat: "basic", credits: 4 });
  });

  it("全形括號、空白、大小寫都能對上", () => {
    expect(guess("微積分（一）").cat).toBe("basic");
    expect(guess(" 離散 數學 ").cat).toBe("required");
    expect(guess("高等unix程式設計").cat).toBe("program");
  });

  it("子字串比對：課名多了班別或少了序號", () => {
    expect(guess("微積分(一)甲班").cat).toBe("basic");
    expect(guess("物理").cat).toBe("basic");
  });

  it("輸入太短時不做子字串比對", () => {
    expect(guess("一").cat).toBe("unknown");
    expect(guess("").cat).toBe("unknown");
    expect(guess(null).cat).toBe("unknown");
  });

  it("語言課用關鍵字判斷，預設 2 學分", () => {
    expect(guess("英文(一)")).toEqual({ cat: "lang", credits: 2 });
    expect(guess("日文")).toEqual({ cat: "lang", credits: 2 });
    expect(guess("溝通與表達")).toEqual({ cat: "lang", credits: 2 });
  });

  it("體育、服務學習等不採計", () => {
    expect(guess("大一體育")).toEqual({ cat: "excluded", credits: 0 });
    expect(guess("體育興趣選項")).toEqual({ cat: "excluded", credits: 0 });
  });

  it("認不得的課歸 unknown，預設 3 學分", () => {
    expect(guess("量子計算導論")).toEqual({ cat: "unknown", credits: 3 });
  });
});
