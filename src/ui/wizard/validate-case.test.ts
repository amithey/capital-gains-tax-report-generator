import { describe, expect, it } from "vitest";
import { parseNumericEntry, validateCase } from "./validate-case";
import { initialFields, type WizardFields } from "./wizard-state";
import { buildRefundInput } from "./build-refund-input";
import type { ImportResult } from "@/ui/import-file";
import { computeAnnualReturn } from "@/tax-engine";

function employee(patch: Partial<WizardFields> = {}): WizardFields {
  return { ...initialFields, profiles: { ...initialFields.profiles, employee: true },
    employers: [{ name: "", income: "100,000", withheld: "0" }], ...patch };
}
const report: ImportResult = { kind: "867", form: {
  taxYear: 2025, identity: {}, gainsByRate: [], offsettableLossesIls: 0,
  turnoverIls: 0, transactionsCount: 0, capitalGainsTaxWithheldIls: 0,
  dividendGrossIls: 0, warnings: [],
} };
const flexImport: ImportResult = { kind: "flex", activity: { trades: [], dividends: [], withholdings: [], warnings: [] } };
const flexResult = computeAnnualReturn({ taxYear: 2025, trades: [], dividends: [], withholdings: [], rates: { base: "ILS", observations: {} } });

describe("numeric entry states", () => {
  it.each(["", "  "])("keeps %j unknown", (raw) => expect(parseNumericEntry(raw).status).toBe("missing"));
  it.each(["0", "0.00", " 0 "])("accepts explicit zero %j", (raw) => expect(parseNumericEntry(raw)).toEqual({ status: "entered", value: 0 }));
  it("accepts grouped decimal amounts", () => expect(parseNumericEntry("12,345.67")).toEqual({ status: "entered", value: 12345.67 }));
  it.each(["1,2", "abc", "NaN", "Infinity", "-1", "1e3", "0x10", "1.2.3", "9007199254740992"])("rejects %j", (raw) => expect(parseNumericEntry(raw).status).toBe("invalid"));
});

describe("annual case gate", () => {
  it("does not treat an empty case as a zero refund", () => expect(validateCase(initialFields, null, null).length).toBeGreaterThan(0));
  it("accepts complete salary with explicit zero withholding", () => expect(validateCase(employee(), null, null)).toEqual([]));
  it("blocks withheld tax without income at the calculation boundary", () => {
    const fields = employee({ employers: [{ name: "", income: "", withheld: "10000" }] });
    expect(validateCase(fields, null, null).some((i) => i.field === "employers.0.income")).toBe(true);
    expect(() => buildRefundInput(fields, null, null)).toThrow();
  });
  it("blocks income without withholding", () => expect(validateCase(employee({ employers: [{ name: "", income: "10000", withheld: "" }] }), null, null).length).toBeGreaterThan(0));
  it("does not silently discard a second blank employer", () => expect(validateCase(employee({ employers: [...employee().employers, { name: "", income: "", withheld: "" }] }), null, null).length).toBe(2));
  it("blocks malformed optional credits", () => expect(validateCase(employee({ donations: "abc" }), null, null).some((i) => i.field === "donations")).toBe(true));
  it("rejects unsupported years", () => expect(validateCase(employee({ taxYear: 2000 }), null, null).some((i) => i.field === "taxYear")).toBe(true));
  it("requires the selected investment document", () => {
    const fields = employee({ profiles: { ...employee().profiles, investor: true } });
    expect(validateCase(fields, null, null).some((i) => i.field === "investment")).toBe(true);
  });
  it("blocks a different-year 867", () => {
    const fields = employee({ profiles: { ...employee().profiles, investor: true } });
    expect(() => buildRefundInput(fields, report, null)).toThrow();
    expect(validateCase({ ...fields, taxYear: 2025 }, report, null)).toEqual([]);
  });
  it("excludes stored investment after profile deselection", () => expect(buildRefundInput(employee(), report, null).investment).toBeUndefined());
  it("requires Flex calculation and checks its year", () => {
    const fields = employee({ profiles: { ...employee().profiles, investor: true } });
    expect(validateCase(fields, flexImport, null).some((i) => i.field === "investmentCalculation")).toBe(true);
    expect(validateCase(fields, flexImport, flexResult).some((i) => i.field === "investmentYear")).toBe(true);
    expect(validateCase({ ...fields, taxYear: 2025 }, flexImport, flexResult)).toEqual([]);
  });
  it("excludes hidden employee credits", () => {
    const fields = employee({ taxYear: 2025, profiles: { employee: false, investor: true, landlord: false, selfEmployed: false }, pension: "999999", donations: "abc" });
    expect(buildRefundInput(fields, report, null).credits).toEqual({});
  });
  it("requires business revenue and advances", () => {
    const fields = employee({ profiles: { ...employee().profiles, selfEmployed: true } });
    expect(validateCase(fields, null, null).map((i) => i.field)).toEqual(["seRevenue", "seAdvances", "seCustomerWithheld"]);
  });
  it.each(["0", "13", "1.5", "abc", ""])("rejects rental month value %j", (rentMonths) => {
    const fields = employee({ profiles: { ...employee().profiles, landlord: true }, rentMonthly: "4000", rentTaxPaid: "0", rentMonths });
    expect(validateCase(fields, null, null).some((i) => i.field.startsWith("rentMonths"))).toBe(true);
  });
});
