export type {
  CurrencyCode,
  IsoDate,
  LotMatchingMethod,
  DisposalLine,
  CapitalGainsResult,
  DividendLine,
  DividendsResult,
  AnnualTaxResult,
} from "./types";
export { computeCapitalGains, type CapitalGainsOptions } from "./capital-gains";
export { computeDividends } from "./dividends";
export { computeAnnualReturn, type AnnualReturnInput } from "./annual-return";
export { computeFrom867, type Form867TaxResult } from "./form-867-return";
export { incomeTaxOnBrackets, creditPointsValue } from "./salary";
export {
  computeCreditPoints,
  type CreditPointsProfile,
  type CreditPointsResult,
  type CreditPointLine,
} from "./credit-points";
export {
  computeRefund,
  investmentFrom867,
  investmentFromFlex,
  type RefundInput,
  type RefundResult,
  type RefundSourceLine,
  type RentalRefundInput,
  type EmployerIncome,
  type SalaryCreditsInput,
  type InvestmentTaxInput,
} from "./refund";
export {
  computeSelfEmployed,
  type SelfEmployedInput,
  type SelfEmployedResult,
  type ExpenseEntry,
  type RecognizedExpenseLine,
} from "./self-employed";
export {
  EXPENSE_CATALOG,
  getExpenseCategory,
  type ExpenseCategory,
  type ExpenseKind,
} from "./expense-catalog";
export {
  compareRentalTracks,
  type RentalInput,
  type RentalExpenses,
  type RentalComparison,
  type RentalTrackResult,
  type RentalTrackId,
  type RentalTaxContext,
} from "./rental";
export { getTaxYearConfig, supportedTaxYears } from "./config";
export type { TaxYearConfig } from "./config";
