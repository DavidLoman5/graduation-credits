import { describe, it, expect } from "vitest";
import { parseTranscript } from "./parse.js";

const byName = (rows, name) => rows.find((r) => r.name === name);

describe("parseTranscript", () => {
  it("略過標題列與統計列", () => {
    const rows = parseTranscript([
      "課別 科目名稱 修習學分 成績",
      "學號 110550000",
      "必  離散數學  3.00  A+",
      "GPA 4.0",
      "",
    ].join("\n"));
    expect(rows.map((r) => r.name)).toEqual(["離散數學"]);
  });

  it("課別「必」：目錄中的基礎科學維持 basic，其餘歸 required", () => {
    const rows = parseTranscript([
      "必  微積分(一)  4.00  A",
      "必  離散數學  3.00  A",
      "必  某某新必修  3.00  A",
    ].join("\n"));
    expect(byName(rows, "微積分(一)").cat).toBe("basic");
    expect(byName(rows, "離散數學").cat).toBe("required");
    expect(byName(rows, "某某新必修").cat).toBe("required");
  });

  it("課別「選」：學程課歸 program，其餘歸 prof", () => {
    const rows = parseTranscript("選  機器學習概論  3.00  A\n選  作業系統設計  3.00  A");
    expect(byName(rows, "機器學習概論").cat).toBe("program");
    expect(byName(rows, "作業系統設計").cat).toBe("prof");
  });

  it("課別「核」「通」先歸 domain 並標為需確認", () => {
    const rows = parseTranscript("核  藝術與美學  2.00  A\n通  哲學概論  2.00  A");
    expect(rows.map((r) => r.cat)).toEqual(["domain", "domain"]);
    expect(rows.every((r) => r.ambiguous)).toBe(true);
  });

  it("課別「語」歸 lang、「體」歸 excluded", () => {
    const rows = parseTranscript("語  西班牙文(一)  2.00  A+\n體  大一體育  0.00  A");
    expect(byName(rows, "西班牙文(一)").cat).toBe("lang");
    expect(byName(rows, "大一體育").cat).toBe("excluded");
    expect(byName(rows, "大一體育").credits).toBe(0);
  });

  it("# 代表英語授課，且會從課名移除", () => {
    const [row] = parseTranscript("必  數位電路設計#  3.00  A+");
    expect(row.name).toBe("數位電路設計");
    expect(row.eng).toBe(true);
  });

  it("F、W 成績不計入", () => {
    const rows = parseTranscript([
      "選  網路程式設計概論  3.00  F",
      "選  組合數學  3.00  W",
      "選  數值方法  3.00  A",
    ].join("\n"));
    expect(rows.map((r) => r.name)).toEqual(["數值方法"]);
  });

  it("整數學分格式也能解析", () => {
    const [row] = parseTranscript("必  線性代數  3  A");
    expect(row.credits).toBe(3);
  });

  it("沒有學分欄時用目錄的預設學分", () => {
    const [row] = parseTranscript("必  微積分(二)");
    expect(row.credits).toBe(4);
    expect(row.cat).toBe("basic");
  });

  it("去掉課號前綴", () => {
    const [row] = parseTranscript("選  DCP1234  數值方法  3.00  A");
    expect(row.name).toBe("數值方法");
    expect(row.cat).toBe("program");
  });

  it("全形括號的課名仍能對上目錄", () => {
    const [row] = parseTranscript("必  微積分（一）  4.00  A");
    expect(row.cat).toBe("basic");
  });

  it("沒有課別欄的列用目錄猜分類", () => {
    const [row] = parseTranscript("離散數學  3.00  A");
    expect(row.cat).toBe("required");
    expect(row.credits).toBe(3);
  });

  it("每列都有 id 且預設 keep", () => {
    const rows = parseTranscript("必  離散數學  3.00  A\n必  機率  3.00  A");
    expect(rows.every((r) => typeof r.id === "string" && r.id && r.keep)).toBe(true);
    expect(new Set(rows.map((r) => r.id)).size).toBe(2);
  });
});
