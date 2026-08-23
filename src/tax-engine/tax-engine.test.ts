import { describe, expect, it } from "vitest";
import type { RawTrade, RawDividend, RawWithholding } from "@/parsers";
import type { RateTable } from "@/rates";
import { computeCapitalGains } from "./capital-gains";
import { computeDividends } from "./dividends";
import { computeAnnualReturn } from "./annual-return";

/** טבלת שערים מדומה לבדיקות (ILS ליחידה). */
const RATES: RateTable = {
  base: "ILS",
  observations: {
    USD: [
      { date: "2024-02-15", rate: 3.7 },
      { date: "2024-04-10", rate: 3.8 },
      { date: "2024-05-10", rate: 3.72 },
      { date: "2024-09-20", rate: 3.75 },
    ],
    EUR: [
      { date: "2024-03-01", rate: 4.0 },
      { date: "2024-06-12", rate: 4.05 },
      { date: "2024-11-05", rate: 4.1 },
    ],
  },
};

function buy(symbol: string, currency: string, date: string, qty: number, price: number, commission: number): RawTrade {
  return { side: "BUY", symbol, currency, date, quantity: qty, price, proceeds: qty * price, commission };
}
function sell(symbol: string, currency: string, date: string, qty: number, price: number, commission: number): RawTrade {
  return { side: "SELL", symbol, currency, date, quantity: qty, price, proceeds: qty * price, commission };
}

describe("computeCapitalGains — FIFO ומכירה חלקית", () => {
  const trades: RawTrade[] = [
    buy("AAPL", "USD", "2024-02-15", 100, 150, 1),
    buy("AAPL", "USD", "2024-04-10", 50, 170, 1),
    sell("AAPL", "USD", "2024-09-20", 80, 200, 1.5),
  ];
  const result = computeCapitalGains(trades, RATES);

  it("מכירה חלקית מתאימה ל-lot הראשון בלבד (שורה אחת)", () => {
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]?.acquisitionDate).toBe("2024-02-15");
    expect(result.lines[0]?.quantity).toBe(80);
  });

  it("בסיס עלות בשער יום הרכישה, תמורה בשער יום המכירה", () => {
    const line = result.lines[0]!;
    // עלות: (15000+1)*3.7 /100 *80 = 44402.96
    expect(line.costBasisIls).toBeCloseTo(44402.96, 2);
    // תמורה: (16000-1.5)*3.75 /80 *80 = 59994.375
    expect(line.proceedsIls).toBeCloseTo(59994.375, 2);
    expect(line.gainIls).toBeCloseTo(15591.415, 2);
  });
});

describe("computeCapitalGains — FIFO על פני שני lots", () => {
  it("מכירה שמכסה שני lots מפיקה שתי שורות בסדר FIFO", () => {
    const trades: RawTrade[] = [
      buy("AAPL", "USD", "2024-02-15", 100, 150, 0),
      buy("AAPL", "USD", "2024-04-10", 50, 170, 0),
      sell("AAPL", "USD", "2024-09-20", 120, 200, 0),
    ];
    const result = computeCapitalGains(trades, RATES);
    expect(result.lines).toHaveLength(2);
    expect(result.lines[0]?.acquisitionDate).toBe("2024-02-15");
    expect(result.lines[0]?.quantity).toBe(100);
    expect(result.lines[1]?.acquisitionDate).toBe("2024-04-10");
    expect(result.lines[1]?.quantity).toBe(20);
  });
});

describe("computeCapitalGains — הפסדים ומטבעות", () => {
  it("הפסד ב-EUR מחושב נכון", () => {
    const trades: RawTrade[] = [
      buy("SAP", "EUR", "2024-03-01", 30, 120, 2),
      sell("SAP", "EUR", "2024-11-05", 30, 110, 2),
    ];
    const result = computeCapitalGains(trades, RATES);
    // עלות (3600+2)*4 = 14408 ; תמורה (3300-2)*4.1 = 13521.8 ; הפסד -886.2
    expect(result.lines[0]?.gainIls).toBeCloseTo(-886.2, 2);
    expect(result.netGainIls).toBeCloseTo(-886.2, 2);
    expect(result.totalLossesIls).toBeCloseTo(886.2, 2);
  });

  it("עסקה שקלית (ILS) אינה מומרת — שער 1", () => {
    const trades: RawTrade[] = [
      buy("TEVA", "ILS", "2024-01-20", 200, 35, 5),
      sell("TEVA", "ILS", "2024-10-15", 200, 32, 5),
    ];
    const result = computeCapitalGains(trades, RATES);
    // (6400-5) - (7000+5) = -610
    expect(result.lines[0]?.gainIls).toBeCloseTo(-610, 2);
  });

  it("מכירה ללא קנייה תואמת מייצרת אזהרה וללא שורה", () => {
    const trades: RawTrade[] = [sell("NVDA", "USD", "2024-09-20", 10, 500, 0)];
    const result = computeCapitalGains(trades, RATES);
    expect(result.lines).toHaveLength(0);
    expect(result.warnings.some((w) => w.includes("ללא קנייה תואמת"))).toBe(true);
  });
});

describe("computeDividends — זיכוי מס זר", () => {
  const dividends: RawDividend[] = [
    { symbol: "AAPL", currency: "USD", date: "2024-05-10", grossAmount: 36 },
    { symbol: "SAP", currency: "EUR", date: "2024-06-12", grossAmount: 66 },
  ];
  const withholdings: RawWithholding[] = [
    { symbol: "AAPL", currency: "USD", date: "2024-05-10", amount: 9 },
    { symbol: "SAP", currency: "EUR", date: "2024-06-12", amount: 17.16 },
  ];
  const result = computeDividends(dividends, withholdings, RATES);

  it("ממיר דיבידנד ומס שנוכה לשקל בשער היום", () => {
    // 36*3.72 + 66*4.05 = 401.22
    expect(result.grossDividendIls).toBeCloseTo(401.22, 2);
    // 9*3.72 + 17.16*4.05 = 102.978
    expect(result.foreignTaxWithheldIls).toBeCloseTo(102.978, 3);
  });

  it("מתאים ניכוי לדיבידנד לפי נייר+תאריך", () => {
    const aapl = result.lines.find((l) => l.symbol === "AAPL");
    expect(aapl?.withheldIls).toBeCloseTo(33.48, 2);
  });
});

describe("computeAnnualReturn — איחוד הכנסות השקעה", () => {
  const trades: RawTrade[] = [
    buy("AAPL", "USD", "2024-02-15", 100, 150, 1),
    buy("AAPL", "USD", "2024-04-10", 50, 170, 1),
    sell("AAPL", "USD", "2024-09-20", 80, 200, 1.5),
    buy("SAP", "EUR", "2024-03-01", 30, 120, 2),
    sell("SAP", "EUR", "2024-11-05", 30, 110, 2),
  ];
  const dividends: RawDividend[] = [
    { symbol: "AAPL", currency: "USD", date: "2024-05-10", grossAmount: 36 },
  ];
  const withholdings: RawWithholding[] = [
    { symbol: "AAPL", currency: "USD", date: "2024-05-10", amount: 9 },
  ];

  it("מס רווח הון על הרווח הנטו בלבד (25%)", () => {
    const r = computeAnnualReturn({ taxYear: 2024, trades, dividends, withholdings, rates: RATES });
    // net gain = 15591.415 - 886.2 = 14705.215 ; *0.25
    expect(r.capitalGains.netGainIls).toBeCloseTo(14705.215, 2);
    expect(r.capitalGainsTaxIls).toBeCloseTo(3676.30375, 2);
  });

  it("זיכוי מס זר מקזז את מס הדיבידנד עד גובהו", () => {
    const r = computeAnnualReturn({ taxYear: 2024, trades, dividends, withholdings, rates: RATES });
    // div gross 36*3.72=133.92 ; tax 25% = 33.48 ; foreign withheld 33.48 ; credit min => 33.48 ; net 0
    expect(r.dividendGrossTaxIls).toBeCloseTo(33.48, 2);
    expect(r.foreignTaxCreditIls).toBeCloseTo(33.48, 2);
    expect(r.dividendNetTaxIls).toBeCloseTo(0, 6);
  });

  it("שיעור בעל מניות מהותי = 30%", () => {
    const r = computeAnnualReturn({ taxYear: 2024, trades: [], dividends, withholdings: [], rates: RATES, substantialShareholder: true });
    // div 133.92 * 0.30 = 40.176, ללא ניכוי
    expect(r.dividendGrossTaxIls).toBeCloseTo(40.176, 3);
  });

  it("שנת מס לא נתמכת זורקת שגיאה ברורה", () => {
    expect(() => computeAnnualReturn({ taxYear: 1990, trades: [], dividends: [], withholdings: [], rates: RATES })).toThrow(/אינה נתמכת/);
  });
});
