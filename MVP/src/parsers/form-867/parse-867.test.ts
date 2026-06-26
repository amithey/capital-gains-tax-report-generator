import { describe, expect, it } from "vitest";
import { parse867 } from "./parse-867";
import type { TextItem } from "./text-items";

/**
 * Fixtures אלה נגזרים מהגאומטריה של קבצי 867 אמיתיים (קואורדינטות pdf.js),
 * אך עם מספרי זיהוי בדויים (לא PII). המספרים הכספיים תואמים לטפסים האמיתיים,
 * כדי לאמת את לוגיקת החילוץ מבוססת-המיקום.
 */

// פריסת שנת 2025: רווח 515 (25%), הפסד בר-קיזוז 879, מחזור 25,097, 6 עסקאות,
// אין ניכוי במקור על רווח הון; עמוד 2 — דיבידנד 15.
const FORM_2025: TextItem[] = [
  { str: "867", x: 38, y: 934, page: 1 },
  { str: "2025", x: 243, y: 924, page: 1 },
  { str: "999999999", x: 429, y: 971, page: 1 },
  { str: "111111", x: 95, y: 1017, page: 1 },
  { str: "222222222", x: 290, y: 1065, page: 1 },
  { str: "35%", x: 42, y: 1168, page: 1 },
  { str: "25%", x: 116, y: 1168, page: 1 },
  { str: "20%", x: 183, y: 1168, page: 1 },
  { str: "15%", x: 251, y: 1168, page: 1 },
  { str: "0%", x: 320, y: 1168, page: 1 },
  { str: "515", x: 137, y: 1192, page: 1 },
  { str: "879", x: 232, y: 1308, page: 1 },
  { str: "25,097", x: 221, y: 1381, page: 1 },
  { str: "256", x: 262, y: 1385, page: 1 },
  { str: "56", x: 369, y: 1385, page: 1 },
  { str: "6", x: 241, y: 1412, page: 1 },
  { str: "040", x: 260, y: 1447, page: 1 },
  // עמוד 2 — דיבידנד
  { str: "867", x: 19, y: 927, page: 2 },
  { str: "23%", x: 104, y: 1158, page: 2 },
  { str: "25%", x: 149, y: 1160, page: 2 },
  { str: "20%", x: 205, y: 1160, page: 2 },
  { str: "15%", x: 261, y: 1160, page: 2 },
  { str: "4%", x: 320, y: 1160, page: 2 },
  { str: "0%", x: 376, y: 1160, page: 2 },
  { str: "15", x: 169, y: 1190, page: 2 },
];

// פריסת שנת 2024: רווח 9 (25%), ללא הפסד, מחזור 7,643, עסקה 1, ניכוי במקור 2.
const FORM_2024: TextItem[] = [
  { str: "867", x: 38, y: 934, page: 1 },
  { str: "2024", x: 243, y: 924, page: 1 },
  { str: "930000000", x: 429, y: 971, page: 1 },
  { str: "123456", x: 95, y: 1017, page: 1 },
  { str: "300000000", x: 290, y: 1065, page: 1 },
  { str: "35%", x: 42, y: 1168, page: 1 },
  { str: "25%", x: 116, y: 1168, page: 1 },
  { str: "20%", x: 183, y: 1168, page: 1 },
  { str: "15%", x: 251, y: 1168, page: 1 },
  { str: "0%", x: 320, y: 1168, page: 1 },
  { str: "9", x: 146, y: 1192, page: 1 },
  { str: "7,643", x: 225, y: 1381, page: 1 },
  { str: "256", x: 262, y: 1385, page: 1 },
  { str: "56", x: 369, y: 1385, page: 1 },
  { str: "1", x: 241, y: 1412, page: 1 },
  { str: "2", x: 241, y: 1443, page: 1 },
  { str: "040", x: 260, y: 1447, page: 1 },
  { str: "2023", x: 144, y: 1588, page: 1 }, // טוקן פוטר — אסור שייבחר כשנת המס
];

describe("parse867 — פריסת 2025", () => {
  const r = parse867(FORM_2025);
  it("שנת מס נכונה (לא טוקן הפוטר)", () => expect(r.taxYear).toBe(2025));
  it("רווח חייב משויך לעמודת 25%", () => {
    expect(r.gainsByRate).toEqual([{ rate: 0.25, amountIls: 515 }]);
  });
  it("הפסד בר-קיזוז", () => expect(r.offsettableLossesIls).toBe(879));
  it("מחזור מכירות", () => expect(r.turnoverIls).toBe(25097));
  it("מספר עסקאות", () => expect(r.transactionsCount).toBe(6));
  it("אין ניכוי במקור על רווח הון", () => expect(r.capitalGainsTaxWithheldIls).toBe(0));
  it("דיבידנד מעמוד 2", () => expect(r.dividendGrossIls).toBe(15));
  it("זיהוי נקרא", () => {
    expect(r.identity.accountNumber).toBe("111111");
    expect(r.identity.taxpayerId).toBe("222222222");
  });
  it("ללא אזהרות", () => expect(r.warnings).toEqual([]));
});

describe("parse867 — פריסת 2024", () => {
  const r = parse867(FORM_2024);
  it("שנת מס 2024 (לא 2023 מהפוטר)", () => expect(r.taxYear).toBe(2024));
  it("רווח 9 ב-25%", () => expect(r.gainsByRate).toEqual([{ rate: 0.25, amountIls: 9 }]));
  it("ללא הפסדים", () => expect(r.offsettableLossesIls).toBe(0));
  it("מחזור 7,643", () => expect(r.turnoverIls).toBe(7643));
  it("עסקה אחת", () => expect(r.transactionsCount).toBe(1));
  it("ניכוי במקור 2", () => expect(r.capitalGainsTaxWithheldIls).toBe(2));
  it("ללא דיבידנד", () => expect(r.dividendGrossIls).toBe(0));
});

describe("parse867 — שגיאות", () => {
  it("זורק כשאין מזהה 867", () => {
    expect(() => parse867([{ str: "123", x: 10, y: 10, page: 1 }])).toThrow(/867/);
  });
});
