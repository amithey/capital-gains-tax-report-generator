import { describe, expect, it } from "vitest";
import { computeSelfEmployed } from "./self-employed";
import { computeRefund } from "./refund";
import { buildRefundInput } from "@/ui/wizard/build-refund-input";
import { initialFields } from "@/ui/wizard/wizard-state";
import { validateCase } from "@/ui/wizard/validate-case";

const business = { taxYear: 2024, businessRevenueIls: 100000, expenses: [], advancesPaidIls: 2000 };
describe("customer tax withholding", () => {
  it.each([2024, 2025])("counts payer withholding once without reducing income (%s)", (taxYear) => {
    const before = computeSelfEmployed({ ...business, taxYear });
    const after = computeSelfEmployed({ ...business, taxYear, customerWithheldIls: 3000 });
    const base = computeRefund({ taxYear, employers: [], creditPoints: 0, selfEmployed: before });
    const result = computeRefund({ taxYear, employers: [], creditPoints: 0, selfEmployed: after });
    expect(after.taxableBusinessIncomeIls).toBe(before.taxableBusinessIncomeIls);
    expect(result.totalLiabilityIls).toBe(base.totalLiabilityIls);
    expect(result.refundIls - base.refundIls).toBeCloseTo(3000);
    expect(result.businessAdvancesPaidIls).toBe(2000);
    expect(result.businessCustomerWithheldIls).toBe(3000);
    expect(result.sources.find((line) => line.id === "business")?.withheldIls).toBe(5000);
  });
  it.each([-1, NaN, Infinity])("rejects invalid payer withholding %s", (customerWithheldIls) => {
    expect(() => computeSelfEmployed({ ...business, customerWithheldIls })).toThrow();
  });
  it("requires an explicit zero or amount in the wizard", () => {
    const fields = { ...initialFields, profiles: { ...initialFields.profiles, selfEmployed: true }, seRevenue: "100000", seAdvances: "2000" };
    expect(validateCase(fields, null, null).map((issue) => issue.field)).toContain("seCustomerWithheld");
    expect(validateCase({ ...fields, seCustomerWithheld: "0" }, null, null)).toEqual([]);
    const input = buildRefundInput({ ...fields, seCustomerWithheld: "3,000" }, null, null);
    expect(input.selfEmployed?.customerWithheldIls).toBe(3000);
    expect(buildRefundInput({ ...fields, profiles: { ...initialFields.profiles, employee: true }, employers: [{ name: "", income: "100000", withheld: "0" }], seCustomerWithheld: "3000" }, null, null).selfEmployed).toBeUndefined();
  });
});
