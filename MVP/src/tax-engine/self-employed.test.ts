import { describe, expect, it } from "vitest";
import { computeSelfEmployed } from "./self-employed";

describe("computeSelfEmployed", () => {
  it("מחשב רווח חייב פשוט: מחזור פחות הוצאות מוכרות מלאות", () => {
    const r = computeSelfEmployed({
      taxYear: 2024,
      businessRevenueIls: 200000,
      expenses: [
        { categoryId: "accounting", amountIls: 6000 },
        { categoryId: "marketing", amountIls: 4000 },
      ],
    });
    expect(r.recognizedExpensesIls).toBe(10000);
    expect(r.netBusinessProfitIls).toBe(190000);
    expect(r.taxableBusinessIncomeIls).toBe(190000);
  });

  it("מחיל שיעור הכרה קבוע על רכב (45%)", () => {
    const r = computeSelfEmployed({
      taxYear: 2024,
      businessRevenueIls: 100000,
      expenses: [{ categoryId: "car", amountIls: 20000 }],
    });
    expect(r.recognizedExpensesIls).toBeCloseTo(9000);
    expect(r.expenseLines[0]?.recognizedShare).toBe(0.45);
  });

  it("מכבד businessUsePercent בקטגוריה יחסית (חדר עבודה)", () => {
    const r = computeSelfEmployed({
      taxYear: 2024,
      businessRevenueIls: 100000,
      expenses: [{ categoryId: "home-office", amountIls: 40000, businessUsePercent: 20 }],
    });
    expect(r.recognizedExpensesIls).toBeCloseTo(8000);
  });

  it("businessUsePercent לא משפיע על קטגוריית capped (רכב נשאר 45%)", () => {
    const r = computeSelfEmployed({
      taxYear: 2024,
      businessRevenueIls: 100000,
      expenses: [{ categoryId: "car", amountIls: 10000, businessUsePercent: 90 }],
    });
    expect(r.recognizedExpensesIls).toBeCloseTo(4500);
  });

  it("הפסד עסקי: רווח חייב 0 + אזהרה", () => {
    const r = computeSelfEmployed({
      taxYear: 2024,
      businessRevenueIls: 10000,
      expenses: [{ categoryId: "rent-office", amountIls: 30000 }],
    });
    expect(r.netBusinessProfitIls).toBe(0);
    expect(r.taxableBusinessIncomeIls).toBe(0);
    expect(r.warnings.some((w) => w.includes("הפסד"))).toBe(true);
  });

  it("ניכוי פנסיה מוגבל ל-11% מההכנסה המזכה", () => {
    const r = computeSelfEmployed({
      taxYear: 2024,
      businessRevenueIls: 100000,
      expenses: [],
      pensionDepositIls: 20000,
    });
    // ניכוי: 11% × 100,000 = 11,000
    expect(r.pensionDeductionIls).toBeCloseTo(11000);
    // זיכוי: היתרה (9,000) מוגבלת ל-5.5% × 100,000 = 5,500 → זיכוי 35% = 1,925
    expect(r.pensionCreditIls).toBeCloseTo(5500 * 0.35);
    expect(r.taxableBusinessIncomeIls).toBeCloseTo(100000 - 11000);
  });

  it("הפקדת פנסיה קטנה: כולה ניכוי, אין זיכוי", () => {
    const r = computeSelfEmployed({
      taxYear: 2024,
      businessRevenueIls: 100000,
      expenses: [],
      pensionDepositIls: 5000,
    });
    expect(r.pensionDeductionIls).toBe(5000);
    expect(r.pensionCreditIls).toBe(0);
  });

  it("תקרת הכנסה מזכה לפנסיה חלה על רווח גבוה", () => {
    const r = computeSelfEmployed({
      taxYear: 2024,
      businessRevenueIls: 500000,
      expenses: [],
      pensionDepositIls: 60000,
    });
    // תקרה 232,800 → ניכוי מקס' 25,608; זיכוי על עד 12,804.
    expect(r.pensionDeductionIls).toBeCloseTo(232800 * 0.11);
    expect(r.pensionCreditIls).toBeCloseTo(232800 * 0.055 * 0.35);
  });

  it("ניכוי קרן השתלמות מוגבל ל-4.5% עד תקרת ההכנסה הקובעת", () => {
    const r = computeSelfEmployed({
      taxYear: 2024,
      businessRevenueIls: 400000,
      expenses: [],
      studyFundDepositIls: 20000,
    });
    // בסיס: min(400,000, 293,397) × 4.5% = 13,202.865
    expect(r.studyFundDeductionIls).toBeCloseTo(293397 * 0.045);
  });

  it("ניכוי 52% מדמי ביטוח לאומי", () => {
    const r = computeSelfEmployed({
      taxYear: 2024,
      businessRevenueIls: 100000,
      expenses: [],
      nationalInsurancePaidIls: 10000,
    });
    expect(r.nationalInsuranceDeductionIls).toBeCloseTo(5200);
    expect(r.taxableBusinessIncomeIls).toBeCloseTo(94800);
  });

  it("מקדמות מועברות כמו שהן", () => {
    const r = computeSelfEmployed({
      taxYear: 2024,
      businessRevenueIls: 100000,
      expenses: [],
      advancesPaidIls: 12000,
    });
    expect(r.advancesPaidIls).toBe(12000);
  });
});
