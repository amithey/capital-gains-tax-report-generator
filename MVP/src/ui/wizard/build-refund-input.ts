import {
  computeFrom867,
  computeSelfEmployed,
  investmentFrom867,
  investmentFromFlex,
  type AnnualTaxResult,
  type EmployerIncome,
  type InvestmentTaxInput,
  type RefundInput,
  type RentalRefundInput,
  type SelfEmployedResult,
} from "@/tax-engine";
import type { ImportResult } from "@/ui/import-file";
import { num, type WizardFields } from "./wizard-state";

/**
 * גשר בין ה-state של האשף למנוע ההחזר: ממיר את שדות הקלט (מחרוזות)
 * לקלט computeRefund מלא לפי הפרופילים שנבחרו.
 */

export function employersFromFields(fields: WizardFields): EmployerIncome[] {
  return fields.employers
    .filter((e) => e.income.trim() !== "" || e.withheld.trim() !== "")
    .map((e) => ({
      taxableIncomeIls: num(e.income),
      taxWithheldIls: num(e.withheld),
      ...(e.name.trim() ? { employerName: e.name.trim() } : {}),
    }));
}

export function selfEmployedFromFields(fields: WizardFields): SelfEmployedResult | undefined {
  if (!fields.profiles.selfEmployed) return undefined;
  if (fields.seRevenue.trim() === "" && fields.seExpenses.length === 0) return undefined;
  return computeSelfEmployed({
    taxYear: fields.taxYear,
    businessRevenueIls: num(fields.seRevenue),
    expenses: fields.seExpenses
      .filter((e) => e.amount.trim() !== "")
      .map((e) => ({
        categoryId: e.categoryId,
        amountIls: num(e.amount),
        ...(e.businessUsePercent.trim() !== "" ? { businessUsePercent: num(e.businessUsePercent) } : {}),
      })),
    ...(fields.sePensionDeposit.trim() ? { pensionDepositIls: num(fields.sePensionDeposit) } : {}),
    ...(fields.seStudyFund.trim() ? { studyFundDepositIls: num(fields.seStudyFund) } : {}),
    ...(fields.seNationalInsurance.trim()
      ? { nationalInsurancePaidIls: num(fields.seNationalInsurance) }
      : {}),
    ...(fields.seAdvances.trim() ? { advancesPaidIls: num(fields.seAdvances) } : {}),
  });
}

export function rentalFromFields(fields: WizardFields): RentalRefundInput | undefined {
  if (!fields.profiles.landlord || fields.rentMonthly.trim() === "") return undefined;
  return {
    taxYear: fields.taxYear,
    monthlyRentIls: num(fields.rentMonthly),
    monthsRented: num(fields.rentMonths) || 12,
    expenses: {
      ...(fields.rentMortgageInterest.trim() ? { mortgageInterestIls: num(fields.rentMortgageInterest) } : {}),
      ...(fields.rentRepairs.trim() ? { repairsIls: num(fields.rentRepairs) } : {}),
      ...(fields.rentManagement.trim() ? { managementFeesIls: num(fields.rentManagement) } : {}),
      ...(fields.rentInsurance.trim() ? { insuranceIls: num(fields.rentInsurance) } : {}),
      ...(fields.rentOther.trim() ? { otherIls: num(fields.rentOther) } : {}),
    },
    ...(fields.rentDepreciationBasis.trim() ? { depreciationBasisIls: num(fields.rentDepreciationBasis) } : {}),
    age60OrOlder: fields.rentAge60,
    ...(fields.rentTaxPaid.trim() ? { taxAlreadyPaidIls: num(fields.rentTaxPaid) } : {}),
    ...(fields.rentChosenTrack !== "auto" ? { chosenTrack: fields.rentChosenTrack } : {}),
  };
}

export interface InvestmentBundle {
  input: InvestmentTaxInput;
  label: string;
}

export function investmentFromImport(
  imported: ImportResult | null,
  flexResult: AnnualTaxResult | null,
): InvestmentBundle | undefined {
  if (imported?.kind === "867") {
    return { input: investmentFrom867(computeFrom867(imported.form)), label: "טופס 867" };
  }
  if (flexResult) {
    return { input: investmentFromFlex(flexResult), label: "ברוקר זר" };
  }
  return undefined;
}

export function buildRefundInput(
  fields: WizardFields,
  imported: ImportResult | null,
  flexResult: AnnualTaxResult | null,
): RefundInput {
  const investment = investmentFromImport(imported, flexResult);
  const selfEmployed = selfEmployedFromFields(fields);
  const rental = rentalFromFields(fields);
  return {
    taxYear: fields.taxYear,
    employers: fields.profiles.employee ? employersFromFields(fields) : [],
    creditPoints: num(fields.creditPoints),
    credits: {
      ...(fields.pension.trim() ? { pensionEmployeeIls: num(fields.pension) } : {}),
      ...(fields.life.trim() ? { lifeInsuranceIls: num(fields.life) } : {}),
      ...(fields.donations.trim() ? { donationsIls: num(fields.donations) } : {}),
    },
    ...(investment ? { investment: investment.input } : {}),
    ...(selfEmployed ? { selfEmployed } : {}),
    ...(rental ? { rental } : {}),
  };
}
