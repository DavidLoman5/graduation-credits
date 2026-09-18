import { describe, it, expect } from "vitest";
import { parseTranscript } from "./parse.js";
import { allocate } from "./allocate.js";
import { RULES } from "../data/rules.js";

const parse = (text) => parseTranscript(text).rows;
const byName = (rows, name) => rows.find((r) => r.name === name);

/* 依真實的「歷年成績表」去識別化後整理的文字版 */
const TRANSCRIPT = `
國立陽明交通大學 歷年成績表
學號 114550000 姓名 王小明 學院 資訊學院
系所組別 資訊工程學系 學士班 輔系(所)
雙主修 入學年月 114 年 9 月 畢業年月
跨域學程
課別 科目名稱 學分 成績 課別 科目名稱 學分 成績
必 微積分甲(一) 4.00 TR
必 微積分甲(二) 4.00 TR
抵免學分合計:8.00
114學年度第1學期(114年9月至114年12月)
必 物理(一) 4.00 A+
必 生涯規劃及導師時間 0.00 P
必 計算機概論與程式設計 3.00 A-
核 西方藝術史導論# 2.00 A
體 大一體育 0.00 A+
選 計算機網路概論 3.00 A+
核 西方音樂的源起與蛻變：從古希臘到巴洛克 2.00 A+
必 線性代數# 3.00 A+
語 學術英文口語溝通 2.00 A+
修習學分: 19.00 實得學分: 19.00 學期平均: 4.17
學期排名: 7/48 (名次/班排名人數)(14.58%)
30/197 (名次/系排名人數)(15.23%)
114學年度第2學期(115年2月至115年6月)
體 大一體育 0.00 A+
核 普通心理學# 2.00 A+
必 生涯規劃及導師時間 0.00 P
必 數位電路設計# 3.00 A+
必 資料結構與物件導向程式設計 3.00 A+
選 數值方法 3.00 A+
必 服務學習(一)○ 0.00 P
必 離散數學 3.00 A+
語 西班牙文(一) 2.00 A+
必 物理(二) 4.00 A+
語 學術英文閱讀與寫作 2.00 A+
修習學分: 22.00 實得學分: 22.00 學期平均: 4.30
學期排名: 1/48 (名次/班排名人數)(2.08%)
1/196 (名次/系排名人數)(0.51%)
累計實得學分: 49.00 歷年總平均: 4.24
歷年成績排名: 3/48 (名次/班排名人數)(6.25%)
12/197 (名次/系排名人數)(6.09%)
學術倫理通過
說明：X:不計學分；研:大學部修研究所課程；TR:抵免；I:成績未完成；**:成績未送達；*:不及格；P:通過；F:不通過；○:基礎服務學習；●:專業服務學習
`;

describe("parseTranscript：整份歷年成績表", () => {
  const { rows, meta } = parseTranscript(TRANSCRIPT);

  it("只解析出課程列，統計、排名、說明都略過", () => {
    expect(rows).toHaveLength(22);
    const junk = /排名|累計|抵免學分合計|修習學分|說明|學術倫理|學年度/;
    expect(rows.filter((r) => junk.test(r.name))).toEqual([]);
  });

  it("依學期分組：抵免 2、114-1 9、114-2 11", () => {
    const count = (t) => rows.filter((r) => r.term === t).length;
    expect(count("TR")).toBe(2);
    expect(count("114-1")).toBe(9);
    expect(count("114-2")).toBe(11);
  });

  it("抬頭資訊：入學學年度與學術倫理", () => {
    expect(meta).toEqual({ entryYear: 114, ethics: true });
  });

  it("抵免的微積分甲歸基礎科學", () => {
    expect(byName(rows, "微積分甲(一)")).toMatchObject({ cat: "basic", credits: 4, term: "TR" });
  });

  it("服務學習的 ○ 標記被去掉且不採計", () => {
    const row = byName(rows, "服務學習(一)");
    expect(row).toBeDefined();
    expect(row.cat).toBe("excluded");
  });

  it("英語授課與核心課程標記", () => {
    expect(byName(rows, "西方藝術史導論")).toMatchObject({ eng: true, cat: "domain", ambiguous: true });
    expect(byName(rows, "線性代數")).toMatchObject({ eng: true, cat: "required" });
  });

  it("配合分配引擎得到與成績單相同的 49 學分", () => {
    const res = allocate(rows, RULES[114]);
    expect(res.total).toBe(49);
  });
});

describe("parseTranscript：個別規則", () => {
  it("略過標題列與統計列", () => {
    const rows = parse("課別 科目名稱 修習學分 成績\n學號 110550000\n必  離散數學  3.00  A+\nGPA 4.0");
    expect(rows.map((r) => r.name)).toEqual(["離散數學"]);
  });

  it("課別「必」：目錄中的基礎科學維持 basic，其餘歸 required", () => {
    const rows = parse("必  微積分(一)  4.00  A\n必  離散數學  3.00  A\n必  某某新必修  3.00  A");
    expect(byName(rows, "微積分(一)").cat).toBe("basic");
    expect(byName(rows, "離散數學").cat).toBe("required");
    expect(byName(rows, "某某新必修").cat).toBe("required");
  });

  it("課別「選」：學程課歸 program，其餘歸 prof", () => {
    const rows = parse("選  機器學習概論  3.00  A\n選  作業系統設計  3.00  A");
    expect(byName(rows, "機器學習概論").cat).toBe("program");
    expect(byName(rows, "作業系統設計").cat).toBe("prof");
  });

  it("課別「核」「通」先歸 domain 並標為需確認", () => {
    const rows = parse("核  藝術與美學  2.00  A\n通  哲學概論  2.00  A");
    expect(rows.map((r) => r.cat)).toEqual(["domain", "domain"]);
    expect(rows.every((r) => r.ambiguous)).toBe(true);
  });

  it("課別「語」歸 lang、「體」歸 excluded", () => {
    const rows = parse("語  西班牙文(一)  2.00  A+\n體  大一體育  0.00  A");
    expect(byName(rows, "西班牙文(一)").cat).toBe("lang");
    expect(byName(rows, "大一體育")).toMatchObject({ cat: "excluded", credits: 0 });
  });

  it("# 代表英語授課，且會從課名移除", () => {
    const [row] = parse("必  數位電路設計#  3.00  A+");
    expect(row.name).toBe("數位電路設計");
    expect(row.eng).toBe(true);
  });

  it("F、*、X、W 不計入；**、I 計入但標 pending；TR、P 計入", () => {
    const rows = parse([
      "選  網路程式設計概論  3.00  F",
      "選  組合數學  3.00  W",
      "選  隨機演算法  3.00  *",
      "選  近似演算法  3.00  X",
      "選  資訊理論與壓縮編碼的應用  3.00  N",
      "選  數值方法  3.00  **",
      "選  正規語言概論  3.00  I",
      "必  微積分(一)  4.00  TR",
      "必  基礎程式設計  0.00  P",
      "選  機器學習概論  3.00  A",
    ].join("\n"));
    expect(rows.map((r) => r.name)).toEqual(["數值方法", "正規語言概論", "微積分(一)", "基礎程式設計", "機器學習概論"]);
    expect(rows.map((r) => r.pending)).toEqual([true, true, false, false, false]);
    expect(byName(rows, "微積分(一)").term).toBe("TR");
  });

  it("學期成績通知單：大標題裡的學年度學期也會被讀到", () => {
    const { rows } = parseTranscript("國立陽明交通大學 114學年度第2學期 成績通知單\n學號 114550000 姓名 王小明\n必 離散數學 3.00 A+");
    expect(rows).toHaveLength(1);
    expect(rows[0].term).toBe("114-2");
  });

  it("說明的續行與日期列不當成課程；OCR 錯一個字的課名會用目錄修正", () => {
    const rows = parse([
      "說明:N:不計學分; 研:大學部修研究所課程",
      "P:通過;F:不通過;W:停修;Y:跨學期課程;#:英語授課",
      "選 數信方法 3.00 A+",
      "2026年9月18日",
    ].join("\n"));
    expect(rows.map((r) => r.name)).toEqual(["數值方法"]);
    expect(rows[0].cat).toBe("program");
  });

  it("OCR 的學期標題：字間有空白、缺「第」、缺學年度都能認得", () => {
    const rows = parse([
      "雙主修 入學年月 114 年 9 月",
      "114 學年度第 1 學期(114 年 9 月至 115 年 1 月)",
      "必 機率 3.00 A",
      "學年度 2 學期(115 年 2 月至 115 年 6 月)",
      "必 離散數學 3.00 A",
    ].join("\n"));
    expect(rows.map((r) => r.term)).toEqual(["114-1", "114-2"]);
  });

  it("缺學年度的標題若沒有任何依據就維持原本的 term", () => {
    const rows = parse("學年度第 2 學期\n必 離散數學 3.00 A");
    expect(rows[0].term).toBe("");
  });

  it("嚴格模式：沒有課別碼也沒有學分的列丟掉；抬頭與說明碎片一律丟掉", () => {
    const text = [
      "學 114550170 姓名陳優資訊學",
      "了所組別資訊工程學系學士班",
      "修",
      "TR 免貫未完成 , 成績送達示 ; 不及 , 通過 ;",
      "必 離散數學 3.00 A+",
      "離散數學概論",
      "修 1 一一",
    ].join("\n");
    expect(parseTranscript(text, { strict: true }).rows.map((r) => r.name)).toEqual(["離散數學"]);
    // 非嚴格模式仍接受沒有學分的純課名列（含這些雜訊），所以貼上文字時不用 strict
    expect(parseTranscript(text).rows.map((r) => r.name)).toEqual(["修", "離散數學", "離散數學概論", "修"]);
  });

  it("學期標題決定 term；標題前的課為未分學期", () => {
    const rows = parse("必 離散數學 3.00 A\n114學年度第1學期(114年9月至115年1月)\n必 機率 3.00 A\n115學年度第2學期\n必 演算法概論 3.00 A");
    expect(rows.map((r) => r.term)).toEqual(["", "114-1", "115-2"]);
  });

  it("兩欄版面：一列兩門課會拆開", () => {
    const rows = parse("必 離散數學 3.00 A+ 選 數值方法 3.00 A\n語 英文(一) 2.00 A 核 哲學概論 2.00 B+");
    expect(rows.map((r) => r.name)).toEqual(["離散數學", "數值方法", "英文(一)", "哲學概論"]);
    expect(rows.map((r) => r.credits)).toEqual([3, 3, 2, 2]);
  });

  it("課名中間被 OCR 插入的空白會去掉", () => {
    const [row] = parse("必 資料 結構與 物件導向程式設計 3.00 A+");
    expect(row.name).toBe("資料結構與物件導向程式設計");
    expect(row.cat).toBe("required");
  });

  it("整數學分格式也能解析", () => {
    const [row] = parse("必  線性代數  3  A");
    expect(row.credits).toBe(3);
  });

  it("沒有學分欄時用目錄的預設學分", () => {
    const [row] = parse("必  微積分(二)");
    expect(row).toMatchObject({ credits: 4, cat: "basic" });
  });

  it("去掉課號前綴", () => {
    const [row] = parse("選  DCP1234  數值方法  3.00  A");
    expect(row).toMatchObject({ name: "數值方法", cat: "program" });
  });

  it("全形括號的課名仍能對上目錄", () => {
    expect(parse("必  微積分（一）  4.00  A")[0].cat).toBe("basic");
  });

  it("沒有課別欄的列用目錄猜分類", () => {
    expect(parse("離散數學  3.00  A")[0]).toMatchObject({ cat: "required", credits: 3 });
  });

  it("每列都有 id 且預設 keep", () => {
    const rows = parse("必  離散數學  3.00  A\n必  機率  3.00  A");
    expect(rows.every((r) => typeof r.id === "string" && r.id && r.keep)).toBe(true);
    expect(new Set(rows.map((r) => r.id)).size).toBe(2);
  });

  it("空字串回傳空結果", () => {
    expect(parseTranscript("")).toEqual({ rows: [], meta: { entryYear: null, ethics: false } });
  });
});
