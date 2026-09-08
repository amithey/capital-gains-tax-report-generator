import { supportedTaxYears, type AnnualTaxResult } from "@/tax-engine";
import type { ImportResult } from "@/ui/import-file";
import type { StepId, WizardFields } from "./wizard-state";

export type NumericEntry = { status: "missing" } | { status: "invalid" } | { status: "entered"; value: number };

/** Empty is unknown, not zero. Only decimal notation with valid thousands groups is accepted. */
export function parseNumericEntry(raw: string): NumericEntry {
  const text = raw.trim();
  if (!text) return { status: "missing" };
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(text)) return { status: "invalid" };
  const value = Number(text.replace(/,/g, ""));
  return Number.isFinite(value) && value <= Number.MAX_SAFE_INTEGER
    ? { status: "entered", value }
    : { status: "invalid" };
}

export interface CaseIssue { field: string; step: StepId; message: string }

export function validateCase(fields: WizardFields, imported: ImportResult | null, flex: AnnualTaxResult | null): CaseIssue[] {
  const issues: CaseIssue[] = [];
  const add = (field: string, step: StepId, message: string) => issues.push({ field, step, message });
  const check = (field: string, raw: string, label: string, step: StepId, required = true, max?: number, integer = false) => {
    const entry = parseNumericEntry(raw);
    if (entry.status === "missing") {
      if (required) add(field, step, `${label}: חסר נתון. אם הסכום אפס, הזינו 0 במפורש.`);
    } else if (entry.status === "invalid" || (max !== undefined && entry.value > max) || (integer && !Number.isInteger(entry.value))) {
      add(field, step, `${label}: יש להזין מספר תקין שאינו שלילי${max !== undefined ? `, עד ${max}` : ""}.`);
    }
  };
  if (!supportedTaxYears().includes(fields.taxYear)) add("taxYear", "profile", "בחרו שנת מס נתמכת.");
  if (!Object.values(fields.profiles).some(Boolean)) add("profiles", "profile", "בחרו לפחות מקור הכנסה אחד. תחום שלא נבחר לא ייכלל בחישוב.");
  check("creditPoints", fields.creditPoints, "נקודות זיכוי", "creditPoints");
  if (fields.profiles.employee) {
    if (!fields.employers.length) add("employers", "employee", "הוסיפו את נתוני המעסיקים מטופסי 106.");
    fields.employers.forEach((e, i) => {
      check(`employers.${i}.income`, e.income, `מעסיק ${i + 1} - הכנסה חייבת`, "employee");
      check(`employers.${i}.withheld`, e.withheld, `מעסיק ${i + 1} - מס שנוכה`, "employee");
    });
  }
  for (const [key, label] of [["pension", "הפקדות עובד לפנסיה"], ["life", "ביטוח חיים"], ["donations", "תרומות"]] as const) {
    if (fields.profiles.employee) check(key, fields[key], label, "employee", false);
  }
  if (fields.profiles.selfEmployed) {
    check("seRevenue", fields.seRevenue, "הכנסה מעסק", "selfEmployed");
    check("seAdvances", fields.seAdvances, "מקדמות מס ששולמו", "selfEmployed");
    for (const key of ["sePensionDeposit", "seStudyFund", "seNationalInsurance"] as const) check(key, fields[key], "הפקדות ותשלומים מהעסק", "selfEmployed", false);
    fields.seExpenses.forEach((e, i) => {
      check(`expenses.${i}.amount`, e.amount, `הוצאה ${i + 1}`, "selfEmployed");
      check(`expenses.${i}.percent`, e.businessUsePercent, `שיעור שימוש עסקי בהוצאה ${i + 1}`, "selfEmployed", false, 100);
    });
  }
  if (fields.profiles.landlord) {
    check("rentMonthly", fields.rentMonthly, "שכר דירה חודשי", "rental");
    check("rentTaxPaid", fields.rentTaxPaid, "מס שכירות ששולם", "rental");
    check("rentMonths", fields.rentMonths, "מספר חודשי השכרה", "rental", true, 12, true);
    if (parseNumericEntry(fields.rentMonths).status === "entered" && Number(fields.rentMonths) === 0) add("rentMonthsZero", "rental", "מספר חודשי השכרה צריך להיות בין 1 ל-12. אם לא השכרתם דירה, הסירו את תחום השכירות.");
    for (const key of ["rentMortgageInterest", "rentRepairs", "rentManagement", "rentInsurance", "rentOther", "rentDepreciationBasis"] as const) check(key, fields[key], "הוצאות ובסיס פחת בשכירות", "rental", false);
  }
  if (fields.profiles.investor) {
    if (!imported) add("investment", "investor", "בחרתם השקעות: העלו דוח לפני חישוב האומדן.");
    else if (imported.kind === "867") {
      if (imported.form.taxYear !== fields.taxYear) add("investmentYear", "investor", `דוח ההשקעות הוא לשנת ${imported.form.taxYear}, אך התיק לשנת ${fields.taxYear}. יש להתאים את השנה או את הדוח.`);
      if (imported.form.warnings.length) add("investmentWarnings", "investor", "דוח ההשקעות כולל אזהרות חילוץ. נדרש אימות הנתונים לפני חישוב מאוחד.");
    } else {
      if (!flex) add("investmentCalculation", "investor", "יש להשלים את חישוב דוח הברוקר הזר, כולל שערי החליפין.");
      else {
        if (flex.taxYear !== fields.taxYear) add("investmentYear", "investor", "תוצאת הברוקר הזר שייכת לשנה אחרת. חשבו מחדש לשנת התיק.");
        if (flex.warnings.length) add("investmentWarnings", "investor", "חישוב הברוקר הזר כולל אזהרות שיש לבדוק לפני חישוב מאוחד.");
      }
    }
  }
  return issues;
}
