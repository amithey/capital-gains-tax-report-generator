import { describe, expect, it } from "vitest";
import { buildFormsGuide } from "./forms-guide";
import { EMPTY_FILING_PROFILE, filingCoverageIssues, type FilingProfile } from "./filing-profile";

const completeProfile: FilingProfile = {
  resident: "yes", spouse: "no", benefits: "no", retirement: "no", foreignIncome: "no", carriedLosses: "no",
  propertySale: "no", specialCase: "no", filingDuty: "no", microBusiness: "no", rentsOwnHome: "no", allDocuments: "yes", bankEvidence: "yes",
};
const base = { taxYear: 2024, hasEmployment: true, employerCount: 1, hasSelfEmployment: false, hasInvestment: false, hasRental: false, filing: completeProfile } as const;
const ids = (guide: ReturnType<typeof buildFormsGuide>) => guide.items.map((item) => item.formId);

describe("conditional filing guide", () => {
  it("does not decide an exemption from an unanswered questionnaire", () => {
    const guide = buildFormsGuide({ ...base, filing: EMPTY_FILING_PROFILE });
    expect(guide.route).toBe("review");
    expect(ids(guide)).not.toContain("135");
  });
  it("offers 135 only as a candidate and never marks the package ready", () => {
    const guide = buildFormsGuide(base);
    expect(guide.route).toBe("135-candidate");
    expect(ids(guide)).toEqual(expect.arrayContaining(["135", "106", "חשבון בנק"]));
    expect(guide.readyToFile).toBe(false);
    expect(guide.readinessIssues.length).toBeGreaterThan(0);
  });
  it("respects a known annual filing duty even for salary only", () => {
    expect(buildFormsGuide({ ...base, filing: { ...completeProfile, filingDuty: "yes" } }).route).toBe("1301-candidate");
  });
  it("includes ordinary business schedules and client withholding evidence", () => {
    const guide = buildFormsGuide({ ...base, hasSelfEmployment: true });
    expect(ids(guide)).toEqual(expect.arrayContaining(["1301", "1320"]));
    expect(guide.items.find((item) => item.formId === "1320")?.attachments.join(" ")).toContain("מלקוחות");
  });
  it.each(["yes", "unknown"] as const)("micro business %s requires route review", (microBusiness) => {
    const guide = buildFormsGuide({ ...base, hasSelfEmployment: true, filing: { ...completeProfile, microBusiness } });
    expect(guide.route).toBe("review");
    expect(ids(guide)).toContain("עסק זעיר");
  });
  it("foreign broker needs detailed sales and foreign-income review", () => {
    expect(ids(buildFormsGuide({ ...base, hasInvestment: true, investmentSource: "flex" }))).toEqual(expect.arrayContaining(["1301", "1322", "1325", "1324"]));
  });
  it("does not equate Israeli brokerage with Israeli-source dividends", () => {
    const guide = buildFormsGuide({ ...base, hasInvestment: true, investmentSource: "867", investmentOriginUnknown: true });
    expect(guide.route).toBe("review");
    expect(ids(guide)).toContain("1324");
  });
  it("flat 10% rental does not itself establish a 1301 obligation", () => {
    const guide = buildFormsGuide({ ...base, hasRental: true, rentalTrack: "flat10" });
    expect(ids(guide)).not.toContain("1301");
    expect(guide.items.find((item) => item.formId === "סעיף 122")?.why).toContain("31 בינואר");
  });
  it("partial exemption includes taxable rental reporting", () => {
    const guide = buildFormsGuide({ ...base, hasRental: true, rentalTrack: "exempt", rentalPartialExemption: true });
    expect(guide.items.find((item) => item.formId === "1321")?.why).toContain("החלק החייב");
  });
  it("separates property sales from rental calculations", () => {
    const guide = buildFormsGuide({ ...base, filing: { ...completeProfile, propertySale: "yes" } });
    expect(guide.route).toBe("review");
    expect(ids(guide)).toContain("מקרקעין");
  });
  it("includes carried losses and spouse evidence when relevant", () => {
    expect(ids(buildFormsGuide({ ...base, filing: { ...completeProfile, spouse: "yes", carriedLosses: "yes" } }))).toEqual(expect.arrayContaining(["בן/בת זוג", "1344"]));
  });
  it.each([2024, 2025])("links only the selected annual form year %s", (taxYear) => {
    const guide = buildFormsGuide({ ...base, taxYear, hasSelfEmployment: true });
    const source = guide.items.find((item) => item.formId === "1320")?.sourceUrl;
    expect(source).toContain(`payment-${taxYear}-`);
    expect(guide.items.every((item) => item.sourceUrl.startsWith("https://www.gov.il/"))).toBe(true);
    expect(buildFormsGuide({ ...base, taxYear }).items.find((item) => item.formId === "135")?.sourceUrl).toContain(`payment-${taxYear}-`);
  });
  it("rejects unresearched years instead of substituting forms", () => {
    expect(() => buildFormsGuide({ ...base, taxYear: 2023 })).toThrow();
  });
  it("distinguishes self-reported evidence from official readiness", () => {
    const guide = buildFormsGuide({ ...base, filing: { ...completeProfile, allDocuments: "unknown", bankEvidence: "no" } });
    expect(guide.readinessIssues).toHaveLength(3);
    expect(guide.answers.some((answer) => answer.answer.includes("טרם נבדק"))).toBe(true);
  });
});

describe("calculation coverage", () => {
  it("simple complete case has no unsupported facts", () => expect(filingCoverageIssues(completeProfile, false, false)).toEqual([]));
  it.each(["spouse", "benefits", "retirement", "foreignIncome", "carriedLosses", "propertySale", "specialCase"] as const)("blocks ignored %s", (key) => {
    expect(filingCoverageIssues({ ...completeProfile, [key]: "yes" }, false, false)).toHaveLength(1);
  });
  it("nonresident and unanswered facts block estimates", () => {
    expect(filingCoverageIssues({ ...completeProfile, resident: "no" }, false, false)).toHaveLength(1);
    expect(filingCoverageIssues(EMPTY_FILING_PROFILE, false, false).length).toBeGreaterThan(0);
  });
  it("ignores stale answers for inactive source profiles", () => {
    const profile = { ...completeProfile, microBusiness: "yes", rentsOwnHome: "yes" } as const;
    expect(filingCoverageIssues(profile, false, false)).toEqual([]);
    expect(filingCoverageIssues(profile, true, true)).toHaveLength(2);
  });
});
