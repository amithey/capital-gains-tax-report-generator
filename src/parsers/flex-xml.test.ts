import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseFlexQueryXml } from "./flex-xml";

const sampleXml = readFileSync(
  fileURLToPath(new URL("../../sample-data/flex-query-sample.xml", import.meta.url)),
  "utf-8",
);

describe("parseFlexQueryXml", () => {
  const result = parseFlexQueryXml(sampleXml);

  it("מחלץ את כל 7 העסקאות", () => {
    expect(result.trades).toHaveLength(7);
  });

  it("מנרמל סימנים: quantity/proceeds/commission חיוביים, side נכון", () => {
    const sell = result.trades.find((t) => t.sourceId === "1003");
    expect(sell).toBeDefined();
    expect(sell?.side).toBe("SELL");
    expect(sell?.quantity).toBe(80);
    expect(sell?.proceeds).toBe(16000);
    expect(sell?.commission).toBe(1.5);
    expect(sell?.currency).toBe("USD");
  });

  it("מזהה מטבעות מרובים", () => {
    const currencies = new Set(result.trades.map((t) => t.currency));
    expect(currencies).toEqual(new Set(["USD", "EUR", "ILS"]));
  });

  it("מחלץ 2 דיבידנדים ומנרמל לסכום ברוטו חיובי", () => {
    expect(result.dividends).toHaveLength(2);
    const sap = result.dividends.find((d) => d.symbol === "SAP");
    expect(sap?.grossAmount).toBe(66);
    expect(sap?.currency).toBe("EUR");
  });

  it("מחלץ 2 ניכויי מס במקור ומנרמל לחיובי", () => {
    expect(result.withholdings).toHaveLength(2);
    const aapl = result.withholdings.find((w) => w.symbol === "AAPL");
    expect(aapl?.amount).toBe(9);
  });

  it("מדלג על שורת ריבית (Broker Interest) עם אזהרה", () => {
    expect(result.warnings.some((w) => w.includes("Broker Interest Received"))).toBe(true);
  });

  it("מנרמל תאריכים ל-ISO", () => {
    const buy = result.trades.find((t) => t.sourceId === "1001");
    expect(buy?.date).toBe("2024-02-15");
  });
});

describe("parseFlexQueryXml — שגיאות", () => {
  it.each([
    '<!DOCTYPE FlexQueryResponse [<!ENTITY custom "expanded">]>',
    '<!DOCTYPE FlexQueryResponse SYSTEM "https://example.invalid/external.dtd">',
    '<!ENTITY custom "expanded">',
    '<!doctype FlexQueryResponse>',
  ])("rejects unsupported declarations before parsing: %s", (declaration) => {
    expect(() => parseFlexQueryXml(declaration + sampleXml)).toThrow(/DOCTYPE.*ENTITY/);
  });

  it("preserves standard escaped characters in report attributes", () => {
    const xml = '<FlexQueryResponse><FlexStatements><FlexStatement><Trades>' +
      '<Trade buySell="BUY" symbol="ABC" tradeDate="20240101" quantity="1" tradePrice="10" proceeds="-10" currency="USD" description="A &amp; B &quot;Fund&quot;" />' +
      '</Trades></FlexStatement></FlexStatements></FlexQueryResponse>';
    expect(parseFlexQueryXml(xml).trades[0]?.description).toBe('A & B "Fund"');
  });

  it("זורק שגיאה ברורה כשאין FlexQueryResponse", () => {
    expect(() => parseFlexQueryXml("<root><foo/></root>")).toThrow(/FlexQueryResponse/);
  });
});
