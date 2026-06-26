import { describe, expect, it } from "vitest";
import { computeCreditPoints } from "./credit-points";

const base = {
  isWoman: false,
  singleParent: false,
  childrenBirthYear: 0,
  children1to5: 0,
  children6to17: 0,
  children18: 0,
  newImmigrant: false,
  dischargedSoldier: false,
  academicDegree: false,
};

describe("computeCreditPoints (2024)", () => {
  it("תושב בסיס = 2.25", () => {
    expect(computeCreditPoints(2024, base).total).toBeCloseTo(2.25, 2);
  });

  it("אישה = 2.75", () => {
    expect(computeCreditPoints(2024, { ...base, isWoman: true }).total).toBeCloseTo(2.75, 2);
  });

  it("אם לשני ילדים בני 1-5 = 2.25 + 0.5 + 2×2.5 = 7.75", () => {
    const r = computeCreditPoints(2024, { ...base, isWoman: true, children1to5: 2 });
    expect(r.total).toBeCloseTo(7.75, 2);
  });

  it("מפיק פירוט שקוף לכל רכיב", () => {
    const r = computeCreditPoints(2024, { ...base, isWoman: true, children1to5: 1, singleParent: true });
    const labels = r.breakdown.map((b) => b.label);
    expect(labels.some((l) => l.includes("תושב"))).toBe(true);
    expect(labels.some((l) => l.includes("אישה"))).toBe(true);
    expect(labels.some((l) => l.includes("חד-הורית"))).toBe(true);
    expect(labels.some((l) => l.includes("1–5"))).toBe(true);
  });

  it("עולה/חייל/תואר מתווספים", () => {
    const r = computeCreditPoints(2024, { ...base, newImmigrant: true, dischargedSoldier: true, academicDegree: true });
    // 2.25 + 1 + 1 + 1 = 5.25
    expect(r.total).toBeCloseTo(5.25, 2);
  });
});
