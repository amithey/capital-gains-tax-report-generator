import { describe, expect, it } from "vitest";
import { resolveRate, mergeRateTables } from "./resolve";
import { parseBoiCsv } from "./boi-csv";
import { parseManualRatesCsv } from "./manual-upload";
import type { RateTable } from "./types";

const table: RateTable = {
  base: "ILS",
  observations: {
    USD: [
      { date: "2024-09-18", rate: 3.75 },
      { date: "2024-09-19", rate: 3.759 },
    ],
  },
};

describe("resolveRate", () => {
  it("שקל מקבל שער 1", () => {
    expect(resolveRate(table, "ILS", "2024-09-21").rate).toBe(1);
  });

  it("שער מדויק בתאריך קיים", () => {
    const r = resolveRate(table, "USD", "2024-09-19");
    expect(r.rate).toBe(3.759);
    expect(r.fellBack).toBe(false);
  });

  it("fallback ליום מסחר קודם כשאין פרסום (סופ\"ש)", () => {
    const r = resolveRate(table, "USD", "2024-09-21");
    expect(r.rate).toBe(3.759);
    expect(r.usedDate).toBe("2024-09-19");
    expect(r.fellBack).toBe(true);
  });

  it("זורק כשאין שער בתאריך או לפניו", () => {
    expect(() => resolveRate(table, "USD", "2024-01-01")).toThrow();
  });

  it("זורק כשהמטבע לא קיים", () => {
    expect(() => resolveRate(table, "GBP", "2024-09-19")).toThrow();
  });
});

describe("parseBoiCsv", () => {
  it("מפרסר CSV של בנק ישראל לפי TIME_PERIOD/OBS_VALUE", () => {
    const csv = [
      "SERIES_CODE,FREQ,BASE_CURRENCY,COUNTER_CURRENCY,UNIT_MEASURE,DATA_TYPE,DATA_SOURCE,TIME_COLLECT,CONF_STATUS,PUB_WEBSITE,UNIT_MULT,COMMENTS,TIME_PERIOD,OBS_VALUE,RELEASE_STATUS",
      "RER_USD_ILS,D,USD,ILS,ILS,OF00,BOI_MRKT,V,F,Y,0,,2024-09-19,3.759,YP",
      "RER_USD_ILS,D,USD,ILS,ILS,OF00,BOI_MRKT,V,F,Y,0,,2024-09-20,3.765,YP",
    ].join("\n");
    const obs = parseBoiCsv(csv);
    expect(obs).toHaveLength(2);
    expect(obs[0]).toEqual({ date: "2024-09-19", rate: 3.759 });
  });
});

describe("parseManualRatesCsv + mergeRateTables", () => {
  it("מפרסר CSV ידני ומדלג על כותרת", () => {
    const csv = "date,currency,rate\n2024-02-15,USD,3.70\n01/03/2024,EUR,4.00";
    const t = parseManualRatesCsv(csv);
    expect(resolveRate(t, "USD", "2024-02-15").rate).toBe(3.7);
    expect(resolveRate(t, "EUR", "2024-03-01").rate).toBe(4.0);
  });

  it("מיזוג טבלאות — מקור מאוחר גובר על תאריך זהה", () => {
    const a: RateTable = { base: "ILS", observations: { USD: [{ date: "2024-02-15", rate: 3.5 }] } };
    const b: RateTable = { base: "ILS", observations: { USD: [{ date: "2024-02-15", rate: 3.7 }] } };
    const merged = mergeRateTables(a, b);
    expect(resolveRate(merged, "USD", "2024-02-15").rate).toBe(3.7);
  });
});
