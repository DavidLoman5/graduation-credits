import { describe, it, expect } from "vitest";
import { cleanOcrText, binarize, statusLabel } from "./ocr.js";

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
