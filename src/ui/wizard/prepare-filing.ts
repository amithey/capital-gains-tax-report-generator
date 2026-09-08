import { computeRefund, supportedTaxYears } from "@/tax-engine";
import type { AnnualTaxResult } from "@/tax-engine";
import { buildFormsGuide } from "@/report/forms-guide";
import { filingCoverageIssues } from "@/report/filing-profile";
import type { ImportResult } from "@/ui/import-file";
import type { WizardFields } from "./wizard-state";
import { buildRefundInput } from "./build-refund-input";
import { validateCase, type CaseIssue } from "./validate-case";

/** One preparation path for screen and print: unsupported facts cannot silently disappear. */
export function prepareFiling(fields: WizardFields, imported: ImportResult | null, flex: AnnualTaxResult | null) {
  const issues: CaseIssue[] = validateCase(fields, imported, flex);
  filingCoverageIssues(fields.filing, fields.profiles.selfEmployed, fields.profiles.landlord).forEach((message, i) => {
    issues.push({ field: `coverage.${i}`, step: "filing", message });
  });
  const unknownInvestmentOrigin = fields.profiles.investor && imported?.kind === "867" && imported.form.dividendGrossIls > 0;
  if (unknownInvestmentOrigin) issues.push({ field: "dividendEvidence", step: "investor", message: "בדוח 867 יש דיבידנדים, אך מקור ההכנסה והמס שנוכה מהם אינם נקלטים במלואם. נדרש אימות לפני אומדן כולל." });
  const result = issues.length ? null : computeRefund(buildRefundInput(fields, imported, flex));
  const rentalTrack = result?.rentalChosenTrack ?? (fields.rentChosenTrack === "auto" ? undefined : fields.rentChosenTrack);
  const guide = supportedTaxYears().includes(fields.taxYear) ? buildFormsGuide({
    taxYear: fields.taxYear,
    hasEmployment: fields.profiles.employee,
    employerCount: fields.employers.length,
    hasSelfEmployment: fields.profiles.selfEmployed,
    hasInvestment: fields.profiles.investor,
    ...(fields.profiles.investor && imported ? { investmentSource: imported.kind } : {}),
    investmentOriginUnknown: unknownInvestmentOrigin,
    hasRental: fields.profiles.landlord,
    ...(rentalTrack ? { rentalTrack } : {}),
    rentalPartialExemption: rentalTrack === "exempt" && (result?.rentalTaxLiabilityIls ?? 0) > 0,
    filing: fields.filing,
  }) : null;
  return { issues, result, guide };
}
