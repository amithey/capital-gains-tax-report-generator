import type { TaxBracket } from "./config";

/**
 * ⚠️ הנחת עבודה, טעון אימות רו"ח. ⚠️
 *
 * חישוב מס הכנסה על משכורת לפי מדרגות מס שולי. ההכנסה החייבת מחויבת בכל מדרגה
 * לפי השיעור השולי שלה (לא שיעור אחיד).
 */
export function incomeTaxOnBrackets(taxableIncomeIls: number, brackets: readonly TaxBracket[]): number {
  if (taxableIncomeIls <= 0) return 0;
  let tax = 0;
  let lower = 0;
  for (const bracket of brackets) {
    const upper = bracket.upTo ?? Infinity;
    if (taxableIncomeIls <= lower) break;
    const amountInBracket = Math.min(taxableIncomeIls, upper) - lower;
    if (amountInBracket > 0) tax += amountInBracket * bracket.rate;
    lower = upper;
  }
  return tax;
}

/** שווי נקודות זיכוי שנתי (נקודות × ערך חודשי × 12). */
export function creditPointsValue(points: number, monthlyValue: number): number {
  return Math.max(0, points) * monthlyValue * 12;
}
