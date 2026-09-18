import { describe, it, expect } from "vitest";
import { guess } from "./catalog.js";

describe("guess", () => {
  it("精確比對目錄", () => {
    expect(guess("離散數學")).toMatchObject({ cat: "required", credits: 3 });
    expect(guess("微積分(一)")).toMatchObject({ cat: "basic", credits: 4 });
    expect(guess("機器學習概論")).toMatchObject({ cat: "program", credits: 3 });
  });

  it("成績單上帶班別的微積分歸基礎科學", () => {
    expect(guess("微積分甲(一)")).toMatchObject({ cat: "basic", credits: 4 });
    expect(guess("微積分乙(二)")).toMatchObject({ cat: "basic", credits: 4 });
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
    expect(guess("英文(一)")).toMatchObject({ cat: "lang", credits: 2 });
    expect(guess("日文")).toMatchObject({ cat: "lang", credits: 2 });
    expect(guess("溝通與表達")).toMatchObject({ cat: "lang", credits: 2 });
  });

  it("體育、服務學習等不採計", () => {
    expect(guess("大一體育")).toMatchObject({ cat: "excluded", credits: 0 });
    expect(guess("體育興趣選項")).toMatchObject({ cat: "excluded", credits: 0 });
  });

  it("只錯一個字時模糊比對到目錄並帶回正確課名", () => {
    expect(guess("數信方法")).toMatchObject({ cat: "program", credits: 3, name: "數值方法", fuzzy: true });
    expect(guess("離散數字")).toMatchObject({ cat: "required", name: "離散數學", fuzzy: true });
    // 少了最後一個字時，子字串比對就先命中，不算 fuzzy
    expect(guess("資料結構與物件導向程式設")).toMatchObject({ cat: "required", name: "資料結構與物件導向程式設計" });
    expect(guess("資料結構與物件導向程式設").fuzzy).toBeUndefined();
    expect(guess("機牽").cat).toBe("unknown"); // 太短不做模糊比對
    expect(guess("數學方程").cat).toBe("unknown"); // 差兩個字不算
  });

  it("認不得的課歸 unknown，預設 3 學分", () => {
    expect(guess("量子計算導論")).toMatchObject({ cat: "unknown", credits: 3 });
  });
});
