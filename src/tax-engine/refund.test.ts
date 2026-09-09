import { describe, expect, it } from "vitest";
import { incomeTaxOnBrackets, creditPointsValue } from "./salary";
import { computeRefund } from "./refund";
import { getTaxYearConfig } from "./config";

const brackets2024 = getTaxYearConfig(2024).marginalBrackets;

describe("refund result contract", () => {
  it("returns the additional income and credit used in the calculation", () => {
    const result = computeRefund({
      taxYear: 2024,
      employers: [],
      creditPoints: 0,
      otherIncome: { taxableIls: 10000, withheldIls: 1200 },
      yishuvMutav: { rate: 0.1, ceilingIls: 5000 },
    });
    expect(result.otherTaxableIncomeIls).toBe(10000);
    expect(result.otherIncomeWithheldIls).toBe(1200);
    expect(result.yishuvMutavCreditIls).toBe(500);
    expect(result.totalWithheldIls).toBe(1200);
    expect(result.refundIls).toBe(700);
  });

  it("returns explicit zero values for absent additional components", () => {
    const result = computeRefund({ taxYear: 2024, employers: [], creditPoints: 0 });
    expect(result.otherTaxableIncomeIls).toBe(0);
    expect(result.otherIncomeWithheldIls).toBe(0);
    expect(result.yishuvMutavCreditIls).toBe(0);
  });
});

describe("incomeTaxOnBrackets (מדרגות 2024)", () => {
  it("הכנסה 0 → מס 0", () => expect(incomeTaxOnBrackets(0, brackets2024)).toBe(0));
  it("בתוך המדרגה הראשונה (10%)", () => {
    expect(incomeTaxOnBrackets(50000, brackets2024)).toBeCloseTo(5000, 2);
  });
  it("חוצה שתי מדרגות (10% ואז 14%)", () => {
    // 84,120*10% + (100,000-84,120)*14% = 8412 + 2223.2 = 10,635.2
    expect(incomeTaxOnBrackets(100000, brackets2024)).toBeCloseTo(10635.2, 2);
  });
});

describe("creditPointsValue", () => {
  it("2.25 נקודות × 242 × 12", () => {
    expect(creditPointsValue(2.25, 242)).toBeCloseTo(6534, 2);
  });
});

describe("computeRefund — מעסיק יחיד", () => {
  const r = computeRefund({
    taxYear: 2024,
    employers: [{ taxableIncomeIls: 100000, taxWithheldIls: 12000 }],
    creditPoints: 2.25,
  });
  it("חבות = מס מדרגות − שווי נקודות זיכוי", () => {
    expect(r.salaryGrossTaxIls).toBeCloseTo(10635.2, 2);
    expect(r.creditPointsValueIls).toBeCloseTo(6534, 2);
    expect(r.salaryTaxLiabilityIls).toBeCloseTo(4101.2, 2);
  });
  it("החזר = מס שנוכה − חבות", () => {
    expect(r.refundIls).toBeCloseTo(7898.8, 2);
    expect(r.isRefund).toBe(true);
  });
});

describe("computeRefund — ריבוי מעסיקים (מקור נפוץ להחזר)", () => {
  const r = computeRefund({
    taxYear: 2024,
    employers: [
      { taxableIncomeIls: 60000, taxWithheldIls: 8000 },
      { taxableIncomeIls: 50000, taxWithheldIls: 9000 },
    ],
    creditPoints: 2.25,
  });
  it("מחושב על סך ההכנסה (110k)", () => {
    expect(r.totalSalaryIncomeIls).toBe(110000);
    // 8412 + (110000-84120)*0.14 = 8412 + 3623.2 = 12035.2 ; − 6534 = 5501.2
    expect(r.salaryTaxLiabilityIls).toBeCloseTo(5501.2, 2);
  });
  it("החזר גדול עקב ניכוי-יתר", () => {
    expect(r.totalWithheldIls).toBe(17000);
    expect(r.refundIls).toBeCloseTo(11498.8, 2);
  });
  it("מציין ריבוי מעסיקים", () => {
    expect(r.notes.some((n) => n.includes("מעסיקים"))).toBe(true);
  });
});

describe("computeRefund — זיכויים", () => {
  it("תרומות/ביטוח/פנסיה מקטינים את החבות", () => {
    const r = computeRefund({
      taxYear: 2024,
      employers: [{ taxableIncomeIls: 200000, taxWithheldIls: 40000 }],
      creditPoints: 0,
      credits: { donationsIls: 1000, lifeInsuranceIls: 2000, pensionEmployeeIls: 5000 },
    });
    // 1000*0.35 + 2000*0.25 + 5000*0.35 = 350 + 500 + 1750 = 2600
    expect(r.otherCreditsIls).toBeCloseTo(2600, 2);
  });
});

describe("computeRefund — קלט חלקי", () => {
  it("ללא משכורת → אזהרת חוסר + מבוסס השקעות בלבד", () => {
    const r = computeRefund({
      taxYear: 2024,
      employers: [],
      creditPoints: 0,
      investment: {
        capitalGainsTaxDueIls: 0,
        capitalGainsTaxWithheldIls: 50,
        dividendTaxDueIls: 0,
        dividendTaxWithheldIls: 0,
      },
    });
    expect(r.refundIls).toBeCloseTo(50, 2); // נוכה 50, חבות 0
    expect(r.missing.some((m) => m.includes("106"))).toBe(true);
  });

  it("ללא נקודות זיכוי → מצוין כחסר", () => {
    const r = computeRefund({ taxYear: 2024, employers: [{ taxableIncomeIls: 50000, taxWithheldIls: 6000 }], creditPoints: 0 });
    expect(r.missing.some((m) => m.includes("נקודות זיכוי"))).toBe(true);
  });
});

describe("computeRefund — שכיר + עצמאי (איחוד מדרגות)", () => {
  const r = computeRefund({
    taxYear: 2024,
    employers: [{ taxableIncomeIls: 60000, taxWithheldIls: 5000 }],
    creditPoints: 0,
    selfEmployed: {
      taxYear: 2024,
      businessRevenueIls: 80000,
      expenseLines: [],
      recognizedExpensesIls: 30000,
      netBusinessProfitIls: 50000,
      pensionDeductionIls: 0,
      pensionCreditIls: 1000,
      studyFundDeductionIls: 0,
      nationalInsuranceDeductionIls: 0,
      taxableBusinessIncomeIls: 50000,
      advancesPaidIls: 8000,
      customerWithheldIls: 0,
      warnings: [],
      notes: [],
    },
  });
  it("המדרגות מחושבות פעם אחת על 110k המאוחדים", () => {
    // 8412 + (110000-84120)*0.14 = 12,035.2 ; − זיכוי פנסיה 1000 = 11,035.2
    expect(r.salaryGrossTaxIls).toBeCloseTo(12035.2, 2);
    expect(r.otherCreditsIls).toBeCloseTo(1000, 2);
    expect(r.salaryTaxLiabilityIls).toBeCloseTo(11035.2, 2);
  });
  it("מקדמות נספרות כמס ששולם", () => {
    expect(r.totalWithheldIls).toBe(13000);
    expect(r.refundIls).toBeCloseTo(13000 - 11035.2, 2);
  });
  it("פירוט מקורות כולל משכורת ועסק", () => {
    expect(r.sources.map((s) => s.id)).toEqual(["salary", "business"]);
  });
});

describe("computeRefund — שכיר + דירה מושכרת", () => {
  it("בוחר אוטומטית את המסלול הזול ומדווח עליו", () => {
    const r = computeRefund({
      taxYear: 2024,
      employers: [{ taxableIncomeIls: 150000, taxWithheldIls: 20000 }],
      creditPoints: 2.25,
      rental: { taxYear: 2024, monthlyRentIls: 5000, monthsRented: 12 },
    });
    expect(r.rentalChosenTrack).toBe("exempt");
    expect(r.rentalTaxLiabilityIls).toBe(0);
  });

  it("מסלול 10% נבחר כשהשכ\"ד גבוה וההוצאות אפס", () => {
    const r = computeRefund({
      taxYear: 2024,
      employers: [{ taxableIncomeIls: 200000, taxWithheldIls: 30000 }],
      creditPoints: 2.25,
      rental: { taxYear: 2024, monthlyRentIls: 12000, monthsRented: 12, taxAlreadyPaidIls: 14400 },
    });
    expect(r.rentalChosenTrack).toBe("flat10");
    expect(r.rentalTaxLiabilityIls).toBeCloseTo(14400);
    expect(r.rentalTaxPaidIls).toBe(14400);
  });

  it("בחירת מסלול ידנית שאינה מומלצת מוסיפה הערה", () => {
    const r = computeRefund({
      taxYear: 2024,
      employers: [],
      creditPoints: 0,
      rental: { taxYear: 2024, monthlyRentIls: 12000, monthsRented: 12, chosenTrack: "marginal" },
    });
    expect(r.rentalChosenTrack).toBe("marginal");
    expect(r.notes.some((n) => n.includes("מוזיל"))).toBe(true);
  });
});

describe("computeRefund — מס יסף", () => {
  it("לא חל מתחת לסף", () => {
    const r = computeRefund({
      taxYear: 2024,
      employers: [{ taxableIncomeIls: 500000, taxWithheldIls: 0 }],
      creditPoints: 0,
    });
    expect(r.surtaxIls).toBe(0);
  });

  it("3% על החלק שמעל הסף, כולל הכנסת השקעות", () => {
    const r = computeRefund({
      taxYear: 2024,
      employers: [{ taxableIncomeIls: 700000, taxWithheldIls: 0 }],
      creditPoints: 0,
      investment: {
        capitalGainsTaxDueIls: 25000,
        capitalGainsTaxWithheldIls: 0,
        dividendTaxDueIls: 0,
        dividendTaxWithheldIls: 0,
        taxableIncomeIls: 100000,
      },
    });
    // בסיס: 800,000 − 721,560 = 78,440 → 3% = 2,353.2
    expect(r.surtaxIls).toBeCloseTo(78440 * 0.03, 2);
    expect(r.sources.some((s) => s.id === "surtax")).toBe(true);
  });
});

describe("computeRefund — כל הפרופילים יחד", () => {
  it("מחזיר פירוט מלא לפי מקור", () => {
    const r = computeRefund({
      taxYear: 2024,
      employers: [{ taxableIncomeIls: 120000, taxWithheldIls: 15000 }],
      creditPoints: 2.25,
      investment: {
        capitalGainsTaxDueIls: 5000,
        capitalGainsTaxWithheldIls: 6000,
        dividendTaxDueIls: 0,
        dividendTaxWithheldIls: 0,
        taxableIncomeIls: 20000,
      },
      selfEmployed: {
        taxYear: 2024,
        businessRevenueIls: 50000,
        expenseLines: [],
        recognizedExpensesIls: 10000,
        netBusinessProfitIls: 40000,
        pensionDeductionIls: 0,
        pensionCreditIls: 0,
        studyFundDeductionIls: 0,
        nationalInsuranceDeductionIls: 0,
        taxableBusinessIncomeIls: 40000,
        advancesPaidIls: 5000,
        customerWithheldIls: 0,
        warnings: [],
        notes: [],
      },
      rental: { taxYear: 2024, monthlyRentIls: 4000, monthsRented: 12 },
    });
    expect(r.sources.map((s) => s.id)).toEqual(["salary", "business", "investment", "rental"]);
    // עקביות פנימית: סך החבות = סכום המקורות.
    const sumTax = r.sources.reduce((s, l) => s + l.taxIls, 0);
    expect(sumTax).toBeCloseTo(r.totalLiabilityIls, 2);
    const sumWithheld = r.sources.reduce((s, l) => s + l.withheldIls, 0);
    expect(sumWithheld).toBeCloseTo(r.totalWithheldIls, 2);
  });
});
