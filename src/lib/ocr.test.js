import { describe, it, expect } from "vitest";
import { cleanOcrText, binarize, statusLabel, groupLines, linesFromWords, medianSlope, findGaps, eraseHorizontalLines, grayscale } from "./ocr.js";

const word = (text, x0, y0, w = 30, h = 30, confidence = 90) => ({ text, x0, x1: x0 + w, y0, y1: y0 + h, confidence });

describe("cleanOcrText", () => {
  it("全形數字、括號、小數點轉半形", () => {
    expect(cleanOcrText("必 微積分（一） ４．００ Ａ＋")).toBe("必 微積分(一) 4.00 A＋");
  });

  it("逗號當小數點、O 當 0", () => {
    expect(cleanOcrText("必 離散數學 3,00 A+")).toBe("必 離散數學 3.00 A+");
    expect(cleanOcrText("體 大一體育 O.OO A+")).toBe("體 大一體育 0.00 A+");
    expect(cleanOcrText("語 西班牙文(一) 2.0O A")).toBe("語 西班牙文(一) 2.00 A");
  });

  it("括號裡的序號空白去掉", () => {
    expect(cleanOcrText("必 物理 ( 一 ) 4.00 A+")).toBe("必 物理(一) 4.00 A+");
  });

  it("中文字之間的空白去掉，課別碼後面的空白保留", () => {
    expect(cleanOcrText("必 資 料 結 構 與 物 件 導 向 程 式 設 計 3.00 A+")).toBe("必 資料結構與物件導向程式設計 3.00 A+");
    expect(cleanOcrText("核 西方音樂的源起與蛻變 ： 從古希臘到巴洛克 2.00 A+")).toBe("核 西方音樂的源起與蛻變：從古希臘到巴洛克 2.00 A+");
    expect(cleanOcrText("114 學年度第 1 學期 (114 年 9 月至 114 年 12 月)")).toBe("114學年度第1學期(114年9月至114年12月)");
  });

  it("表格線讀成 | 「 」 時去掉；掉了小數點的學分補回", () => {
    expect(cleanOcrText("必 |離散數學 300 | A+")).toBe("必 離散數學 3.00 A+");
    expect(cleanOcrText("語 「學術英文閱讀與寫作 2.00 | A+")).toBe("語 學術英文閱讀與寫作 2.00 A+");
    expect(cleanOcrText("必 服務學習(一) 000 P")).toBe("必 服務學習(一) 0.00 P");
    expect(cleanOcrText("學號 114550170 姓名")).toBe("學號 114550170 姓名"); // 長數字不動
  });

  it("英語授課的 # 黏回課名", () => {
    expect(cleanOcrText("必 線性代數 # 3.00 A+")).toBe("必 線性代數# 3.00 A+");
  });

  it("沒有中文也沒有數字的雜訊列丟掉、空白列丟掉", () => {
    expect(cleanOcrText("|| -- ..\n\n必 機率 3.00 A\n~~~")).toBe("必 機率 3.00 A");
  });

  it("多餘空白合併", () => {
    expect(cleanOcrText("  必    機率    3.00    A  ")).toBe("必 機率 3.00 A");
  });

  it("空輸入", () => {
    expect(cleanOcrText("")).toBe("");
    expect(cleanOcrText(null)).toBe("");
  });
});

describe("binarize", () => {
  it("深色像素變黑、淺色變白，alpha 全為 255", () => {
    const w = 4, h = 1;
    const rgba = new Uint8ClampedArray([
      0, 0, 0, 255,        // 黑
      255, 255, 255, 255,  // 白
      255, 255, 255, 255,
      255, 255, 255, 255,
    ]);
    const out = binarize(rgba, w, h, 3, 10);
    expect(out[0]).toBe(0);
    expect(out[4]).toBe(255);
    expect([out[3], out[7], out[11], out[15]]).toEqual([255, 255, 255, 255]);
  });

  it("均勻的淺灰背景（浮水印）全部變白", () => {
    const w = 8, h = 8;
    const rgba = new Uint8ClampedArray(w * h * 4).fill(200);
    for (let i = 3; i < rgba.length; i += 4) rgba[i] = 255;
    const out = binarize(rgba, w, h, 5, 10);
    for (let i = 0; i < out.length; i += 4) expect(out[i]).toBe(255);
  });
});

describe("statusLabel", () => {
  it("對應中文提示", () => {
    expect(statusLabel("preprocessing")).toBe("處理照片…");
    expect(statusLabel("loading language traineddata")).toContain("下載辨識模型");
    expect(statusLabel("recognizing text")).toBe("辨識中");
    expect(statusLabel("whatever")).toBe("準備中…");
  });
});

describe("groupLines / linesFromWords", () => {
  it("同一列的字依 x 排序，不同列依 y 排序", () => {
    const words = [word("3.00", 600, 100), word("必", 10, 102), word("離散數學", 60, 101), word("必", 10, 150), word("機率", 60, 150)];
    expect(linesFromWords(words)).toEqual(["必 離散數學 3.00", "必 機率"]);
  });

  it("照片歪斜時用基線斜率扶正：右邊偏高的學分欄仍歸同一列", () => {
    // 斜率 -0.03：x 每往右 1000，y 往上 30
    const words = [word("必", 10, 200), word("離散數學", 60, 199), word("3.00", 1000, 170), word("A+", 1100, 167), word("必", 10, 250), word("機率", 60, 250)];
    expect(linesFromWords(words, { slope: -0.03 })).toEqual(["必 離散數學 3.00 A+", "必 機率"]);
    // 不扶正就會被拆成三列
    expect(linesFromWords(words)).toHaveLength(3);
  });

  it("低信心的字被過濾；回傳的列帶座標", () => {
    const lines = groupLines([word("必", 10, 100), word("噪", 400, 100, 30, 30, 5), word("離散數學", 60, 100)], { minConfidence: 30 });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ text: "必 離散數學", x0: 10, x1: 90, y0: 100, y1: 130, h: 30 });
  });

  it("空陣列", () => {
    expect(linesFromWords([])).toEqual([]);
  });
});

describe("medianSlope", () => {
  it("取中位數，沒資料時為 0", () => {
    expect(medianSlope([{ slope: -0.03 }, { slope: 0.5 }, { slope: -0.02 }])).toBe(-0.02);
    expect(medianSlope([])).toBe(0);
    expect(medianSlope(undefined)).toBe(0);
  });
});

describe("findGaps", () => {
  const line = (cy, text = "x") => ({ cy, x0: 10, x1: 500, y0: cy - 15, y1: cy + 15, h: 30, text });

  it("列距正常時沒有空隙", () => {
    expect(findGaps([line(100), line(140), line(180), line(220)])).toEqual([]);
  });

  it("列距異常大的地方回報空隙，裁框上下各留半行、寬到文字欄右緣", () => {
    const gaps = findGaps([line(100), line(140), line(260), line(300), line(340)]);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toMatchObject({ index: 1, x0: 0 });
    expect(gaps[0].y0).toBe(140 + 15 - 15); // a.y1 - 0.5h
    expect(gaps[0].y1).toBe(260 - 15 + 15); // b.y0 + 0.5h
    expect(gaps[0].x1).toBeGreaterThan(500);
  });

  it("列太少時不處理", () => {
    expect(findGaps([line(100), line(300)])).toEqual([]);
  });
});

describe("eraseHorizontalLines / grayscale", () => {
  it("長的水平黑線被塗白，短的筆畫保留", () => {
    const w = 40, h = 5;
    const rgba = new Uint8ClampedArray(w * h * 4).fill(255);
    const setDark = (x, y) => { const j = (y * w + x) * 4; rgba[j] = rgba[j + 1] = rgba[j + 2] = 0; };
    for (let x = 0; x < 40; x++) setDark(x, 2);   // 整列橫線
    setDark(5, 0); setDark(6, 0);                   // 短筆畫
    eraseHorizontalLines(rgba, w, h, 7, 10, 20);
    expect(rgba[(2 * w + 20) * 4]).toBe(255);
    expect(rgba[(0 * w + 5) * 4]).toBe(0);
  });

  it("grayscale 轉成灰階且 alpha 為 255", () => {
    const out = grayscale(new Uint8ClampedArray([255, 0, 0, 10]));
    expect(out[0]).toBe(out[1]);
    expect(out[3]).toBe(255);
    expect(Math.round(out[0])).toBe(76);
  });
});
