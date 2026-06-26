import { TAX_YEAR_2024 } from "./year-2024";
import { TAX_YEAR_2025 } from "./year-2025";
import type { TaxYearConfig } from "./types";

export type { TaxYearConfig, TaxBracket, CapitalGainsConfig, SalaryCreditsConfig, CreditPointsConfig } from "./types";

/**
 * רישום תצורות לפי שנת מס. הוספת שנה = הוספת קובץ year-XXXX.ts ורישומו כאן.
 */
const REGISTRY: Readonly<Record<number, TaxYearConfig>> = {
  2024: TAX_YEAR_2024,
  2025: TAX_YEAR_2025,
};

/** מחזיר את תצורת שנת המס, או זורק שגיאה ברורה אם השנה אינה נתמכת עדיין. */
export function getTaxYearConfig(year: number): TaxYearConfig {
  const config = REGISTRY[year];
  if (config === undefined) {
    const supported = Object.keys(REGISTRY).join(", ");
    throw new Error(
      `שנת המס ${year} אינה נתמכת עדיין. שנים נתמכות: ${supported}. נא להוסיף קובץ תצורה לשנה זו.`,
    );
  }
  return config;
}

export function supportedTaxYears(): number[] {
  return Object.keys(REGISTRY)
    .map(Number)
    .sort((a, b) => b - a);
}
