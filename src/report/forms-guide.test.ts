import { describe, expect, it } from "vitest";
import { buildFormsGuide } from "./forms-guide";

const base = {
  taxYear: 2024,
  hasEmployment: false,
  employerCount: 0,
  hasSelfEmployment: false,
  hasInvestment: false,
  hasRental: false,
} as const;

function formIds(guide: ReturnType<typeof buildFormsGuide>): string[] {
  return guide.items.map((i) => i.formId);
}

describe("buildFormsGuide", () => {
  it("שכיר טהור: אין חובת הגשה → טופס 135 + 106", () => {
    const g = buildFormsGuide({ ...base, hasEmployment: true, employerCount: 1 });
    expect(g.mustFile).toBe(false);
    expect(formIds(g)).toContain("135");
    expect(formIds(g)).toContain("106");
    expect(formIds(g)).not.toContain("1301");
  });

  it("עצמאי: חובת הגשה → 1301 + נספח א'", () => {
    const g = buildFormsGuide({ ...base, hasSelfEmployment: true });
    expect(g.mustFile).toBe(true);
    expect(formIds(g)).toContain("1301");
    expect(formIds(g)).toContain("1320 (נספח א')");
    expect(formIds(g)).not.toContain("135");
  });

  it("משקיע בברוקר ישראלי: נספח ג' + צירוף 867, בלי נספח ד'", () => {
    const g = buildFormsGuide({ ...base, hasEmployment: true, employerCount: 1, hasInvestment: true, investmentSource: "867" });
    expect(formIds(g)).toContain("1322 (נספח ג')");
    expect(formIds(g)).not.toContain("נספח ד'");
    const inv = g.items.find((i) => i.formId === "1322 (נספח ג')")!;
    expect(inv.attachments.some((a) => a.includes("867"))).toBe(true);
  });

  it("משקיע בברוקר זר: גם נספח ד' (1324) לזיכוי מס זר", () => {
    const g = buildFormsGuide({ ...base, hasInvestment: true, investmentSource: "flex" });
    expect(formIds(g)).toContain("1324 (נספח ד')");
  });

  it("משקיע בברוקר זר מחייב 1301 (לא 135) — הכנסת חו\"ל", () => {
    const g = buildFormsGuide({ ...base, hasEmployment: true, employerCount: 1, hasInvestment: true, investmentSource: "flex" });
    expect(g.mustFile).toBe(true);
    expect(formIds(g)).toContain("1301");
    expect(formIds(g)).not.toContain("135");
    expect(g.filingExplanation).toContain("חו\"ל");
  });

  it("משקיע בברוקר ישראלי (867) בלבד — עדיין 135, עם הסתייגות", () => {
    const g = buildFormsGuide({ ...base, hasEmployment: true, employerCount: 1, hasInvestment: true, investmentSource: "867" });
    expect(g.mustFile).toBe(false);
    expect(formIds(g)).toContain("135");
    expect(g.filingExplanation).toContain("ברוקר ישראלי");
  });

  it("דירה במסלול שולי: חובת הגשה + נספח ב'", () => {
    const g = buildFormsGuide({ ...base, hasRental: true, rentalTrack: "marginal" });
    expect(g.mustFile).toBe(true);
    expect(formIds(g)).toContain("1321 (נספח ב')");
  });

  it("דירה במסלול 10%: חובת הגשה + הסבר על התשלום העצמאי", () => {
    const g = buildFormsGuide({ ...base, hasRental: true, rentalTrack: "flat10" });
    expect(g.mustFile).toBe(true);
    const item = g.items.find((i) => i.formId === "ס' 122")!;
    expect(item.why).toContain("30 בינואר");
  });

  it("דירה בפטור מלא: אין חובת הגשה, רק תיעוד", () => {
    const g = buildFormsGuide({ ...base, hasEmployment: true, employerCount: 1, hasRental: true, rentalTrack: "exempt" });
    expect(g.mustFile).toBe(false);
    expect(formIds(g)).toContain("פטור");
  });

  it("כל הפרופילים יחד: 1301 + כל הנספחים", () => {
    const g = buildFormsGuide({
      ...base,
      hasEmployment: true,
      employerCount: 2,
      hasSelfEmployment: true,
      hasInvestment: true,
      investmentSource: "flex",
      hasRental: true,
      rentalTrack: "marginal",
    });
    expect(g.mustFile).toBe(true);
    const ids = formIds(g);
    expect(ids).toContain("1301");
    expect(ids).toContain("106");
    expect(ids).toContain("1320 (נספח א')");
    expect(ids).toContain("1322 (נספח ג')");
    expect(ids).toContain("1324 (נספח ד')");
    expect(ids).toContain("1321 (נספח ב')");
  });

  it("ריבוי מעסיקים מודגש בהסבר של 106", () => {
    const g = buildFormsGuide({ ...base, hasEmployment: true, employerCount: 3 });
    const item = g.items.find((i) => i.formId === "106")!;
    expect(item.formName).toContain("3");
    expect(item.why).toContain("מקור ההחזר");
  });
});
