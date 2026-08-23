import { describe, expect, it } from "vitest";
import { compareRentalTracks, type RentalTaxContext } from "./rental";

/** context פשוט: מס שולי קבוע של 35% על כל תוספת. */
const ctx35: RentalTaxContext = { taxOnAdditionalIncome: (x) => x * 0.35 };
/** context של מדרגה נמוכה (14%) — בודק את רצפת ה-31%. */
const ctx14: RentalTaxContext = { taxOnAdditionalIncome: (x) => x * 0.14 };

describe("compareRentalTracks", () => {
  it("שכ\"ד מתחת לתקרה: פטור מלא, מס 0, מומלץ פטור", () => {
    const r = compareRentalTracks(
      { taxYear: 2024, monthlyRentIls: 5000, monthsRented: 12 },
      ctx35,
    );
    const exempt = r.tracks.find((t) => t.track === "exempt")!;
    expect(exempt.available).toBe(true);
    expect(exempt.taxIls).toBe(0);
    expect(r.recommendedTrack).toBe("exempt");
  });

  it("שכ\"ד בדיוק בתקרה: עדיין פטור מלא", () => {
    const r = compareRentalTracks(
      { taxYear: 2024, monthlyRentIls: 5654, monthsRented: 12 },
      ctx35,
    );
    expect(r.tracks.find((t) => t.track === "exempt")!.taxIls).toBe(0);
  });

  it("בין התקרה לכפל: פטור חלקי עם תקרה מתואמת", () => {
    // שכ\"ד 7,000: חריגה 1,346 → תקרה מתואמת 4,308 → חייב 2,692/חודש.
    const r = compareRentalTracks(
      { taxYear: 2024, monthlyRentIls: 7000, monthsRented: 12, age60OrOlder: true },
      ctx35,
    );
    const exempt = r.tracks.find((t) => t.track === "exempt")!;
    expect(exempt.available).toBe(true);
    const expectedTaxable = (7000 - (5654 - (7000 - 5654))) * 12;
    expect(exempt.taxableIncomeIls).toBeCloseTo(expectedTaxable);
    expect(exempt.taxIls).toBeCloseTo(expectedTaxable * 0.35);
    expect(r.warnings.some((w) => w.includes("פטור החלקי"))).toBe(true);
  });

  it("מעל כפל התקרה: מסלול פטור לא זמין ולא מומלץ", () => {
    const r = compareRentalTracks(
      { taxYear: 2024, monthlyRentIls: 12000, monthsRented: 12 },
      ctx35,
    );
    expect(r.tracks.find((t) => t.track === "exempt")!.available).toBe(false);
    expect(r.recommendedTrack).not.toBe("exempt");
  });

  it("מסלול 10%: על הברוטו בלי הוצאות", () => {
    const r = compareRentalTracks(
      { taxYear: 2024, monthlyRentIls: 8000, monthsRented: 12 },
      ctx35,
    );
    expect(r.tracks.find((t) => t.track === "flat10")!.taxIls).toBeCloseTo(8000 * 12 * 0.1);
  });

  it("מסלול שולי: מנכה הוצאות ופחת; הוצאות גבוהות הופכות אותו למשתלם", () => {
    // 12,000/חודש — מעל כפל התקרה, אין פטור; ההשוואה בין 10% לשולי.
    const r = compareRentalTracks(
      {
        taxYear: 2024,
        monthlyRentIls: 12000,
        monthsRented: 12,
        age60OrOlder: true,
        expenses: { mortgageInterestIls: 70000, repairsIls: 15000 },
        depreciationBasisIls: 1500000, // פחת 2% = 30,000
      },
      ctx35,
    );
    const marginal = r.tracks.find((t) => t.track === "marginal")!;
    // 144,000 − 115,000 = 29,000 חייב → מס 10,150 < 14,400 (מסלול 10%)
    expect(marginal.taxableIncomeIls).toBeCloseTo(29000);
    expect(marginal.taxIls).toBeCloseTo(29000 * 0.35);
    expect(r.recommendedTrack).toBe("marginal");
  });

  it("רצפת 31% חלה מתחת לגיל 60 גם כשהמדרגה נמוכה", () => {
    const r = compareRentalTracks(
      {
        taxYear: 2024,
        monthlyRentIls: 12000,
        monthsRented: 12,
        age60OrOlder: false,
      },
      ctx14,
    );
    const marginal = r.tracks.find((t) => t.track === "marginal")!;
    expect(marginal.taxIls).toBeCloseTo(12000 * 12 * 0.31);
  });

  it("בגיל 60+ אין רצפה — המדרגה האמיתית חלה", () => {
    const r = compareRentalTracks(
      { taxYear: 2024, monthlyRentIls: 12000, monthsRented: 12, age60OrOlder: true },
      ctx14,
    );
    const marginal = r.tracks.find((t) => t.track === "marginal")!;
    expect(marginal.taxIls).toBeCloseTo(12000 * 12 * 0.14);
  });

  it("הפסד משכירות במסלול השולי: חבות 0 + אזהרה", () => {
    const r = compareRentalTracks(
      {
        taxYear: 2024,
        monthlyRentIls: 3000,
        monthsRented: 12,
        expenses: { mortgageInterestIls: 50000 },
      },
      ctx35,
    );
    const marginal = r.tracks.find((t) => t.track === "marginal")!;
    expect(marginal.taxIls).toBe(0);
    expect(r.warnings.some((w) => w.includes("הפסד"))).toBe(true);
  });

  it("הערת פחת מופיעה כשהוזן בסיס פחת", () => {
    const r = compareRentalTracks(
      { taxYear: 2024, monthlyRentIls: 6000, monthsRented: 12, depreciationBasisIls: 800000 },
      ctx35,
    );
    expect(r.notes.some((n) => n.includes("מס שבח"))).toBe(true);
  });
});
