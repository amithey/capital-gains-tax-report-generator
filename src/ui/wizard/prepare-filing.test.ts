import { describe, expect, it } from "vitest";
import { prepareFiling } from "./prepare-filing";
import { initialFields, type WizardFields } from "./wizard-state";
import type { FilingProfile } from "@/report/filing-profile";

const filing: FilingProfile = {
  resident: "yes", spouse: "no", benefits: "no", retirement: "no", foreignIncome: "no", carriedLosses: "no",
  propertySale: "no", specialCase: "no", filingDuty: "no", microBusiness: "no", rentsOwnHome: "no", allDocuments: "yes", bankEvidence: "yes",
};
const fields: WizardFields = { ...initialFields, filing, profiles: { ...initialFields.profiles, employee: true }, employers: [{ name: "Synthetic employer", income: "100000", withheld: "10000" }] };

describe("annual filing preparation boundary", () => {
  it("prepares the same estimate and guide for screen and print", () => {
    const prepared = prepareFiling(fields, null, null);
    expect(prepared.issues).toEqual([]);
    expect(prepared.result?.refundIls).toBeCloseTo(5898.8);
    expect(prepared.guide?.route).toBe("135-candidate");
    expect(prepared.guide?.readyToFile).toBe(false);
  });
  it("keeps a document checklist but removes the estimate for unknown facts", () => {
    const prepared = prepareFiling({ ...fields, filing: initialFields.filing }, null, null);
    expect(prepared.result).toBeNull();
    expect(prepared.guide).not.toBeNull();
    expect(prepared.issues.some((issue) => issue.step === "filing")).toBe(true);
  });
  it.each(["benefits", "spouse", "propertySale", "carriedLosses", "foreignIncome"] as const)("does not calculate around unsupported %s", (key) => {
    const prepared = prepareFiling({ ...fields, filing: { ...filing, [key]: "yes" } }, null, null);
    expect(prepared.result).toBeNull();
    expect(prepared.issues).toHaveLength(1);
  });
  it("missing salary remains blocked even when documents were self-confirmed", () => {
    const prepared = prepareFiling({ ...fields, employers: [{ name: "", income: "", withheld: "10000" }] }, null, null);
    expect(prepared.result).toBeNull();
    expect(prepared.issues[0]?.step).toBe("employee");
  });
  it("never substitutes forms for an unsupported tax year", () => {
    const prepared = prepareFiling({ ...fields, taxYear: 2023 }, null, null);
    expect(prepared.result).toBeNull();
    expect(prepared.guide).toBeNull();
  });
  it("missing bank evidence affects filing completeness, not arithmetic", () => {
    const prepared = prepareFiling({ ...fields, filing: { ...filing, bankEvidence: "no" } }, null, null);
    expect(prepared.result).not.toBeNull();
    expect(prepared.guide?.readinessIssues.join(" ")).toContain("בנק");
  });
});
