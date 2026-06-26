import type { RawDividend, RawTrade, RawWithholding } from "@/parsers";
import type { RateTable } from "@/rates";
import { getTaxYearConfig } from "./config";
import { computeCapitalGains, type CapitalGainsOptions } from "./capital-gains";
import { computeDividends } from "./dividends";
import type { AnnualTaxResult, LotMatchingMethod } from "./types";

/**
 * ⚠️ הנחת עבודה, טעון אימות רו"ח. ⚠️
 *
 * אגרגטור החישוב השנתי. כרגע מאחד הכנסות השקעה (רווחי הון + דיבידנדים) לחבות
 * מס. נבנה רב-מקורי בכוונה: כשיתווסף מודול המשכורת (Phase 3) הוא ייכנס כאן
 * כמקור נוסף, וההחזר הסופי יחושב מול סך המס שנוכה.
 *
 * החלטות מס (מתועדות):
 * - רווח הון: מס בשיעור קבוע על הרווח הנטו (רווחים פחות הפסדים). הפסד נטו אינו
 *   יוצר מס (וניתן לקיזוז עתידי — לא ממומש ב-MVP).
 * - דיבידנד: בדין הישראלי הנוכחי שיעור המס על דיבידנד שווה לשיעור רווח ההון
 *   (25% / 30% לבעל מניות מהותי). מס זר שנוכה במקור מזכה כנגד המס הישראלי על
 *   אותה הכנסה, עד גובהו (זיכוי מס זר).
 */

export interface AnnualReturnInput {
  readonly taxYear: number;
  readonly trades: readonly RawTrade[];
  readonly dividends: readonly RawDividend[];
  readonly withholdings: readonly RawWithholding[];
  readonly rates: RateTable;
  /** ברירת מחדל: יחיד (25%). true → בעל מניות מהותי (30%). */
  readonly substantialShareholder?: boolean;
  readonly lotMatchingMethod?: LotMatchingMethod;
}

export function computeAnnualReturn(input: AnnualReturnInput): AnnualTaxResult {
  const config = getTaxYearConfig(input.taxYear);
  const rate = input.substantialShareholder
    ? config.capitalGains.substantialShareholderRate
    : config.capitalGains.individualRate;

  const cgOptions: CapitalGainsOptions = input.lotMatchingMethod
    ? { method: input.lotMatchingMethod }
    : {};
  const capitalGains = computeCapitalGains(input.trades, input.rates, cgOptions);
  const dividends = computeDividends(input.dividends, input.withholdings, input.rates);

  // מס רווח הון: רק על רווח נטו חיובי.
  const capitalGainsTaxIls = Math.max(0, capitalGains.netGainIls) * rate;

  // מס דיבידנד + זיכוי מס זר.
  const dividendGrossTaxIls = dividends.grossDividendIls * rate;
  const foreignTaxCreditIls = Math.min(dividends.foreignTaxWithheldIls, dividendGrossTaxIls);
  const dividendNetTaxIls = Math.max(0, dividendGrossTaxIls - foreignTaxCreditIls);

  const investmentTaxIls = capitalGainsTaxIls + dividendNetTaxIls;

  const notes: string[] = [
    `שיעור המס שיושם: ${(rate * 100).toFixed(0)}% (${input.substantialShareholder ? "בעל מניות מהותי" : "יחיד"}).`,
    "חישוב זה כולל הכנסות השקעה בלבד (רווחי הון + דיבידנדים). הוא אינו כולל משכורת, נקודות זיכוי, ניכויים או מס יסף — ולכן אינו אומדן החזר/חבות סופי.",
    config.capitalGains.note,
  ];
  if (capitalGains.netGainIls < 0) {
    notes.push(
      `נרשם הפסד הון נטו של ${Math.abs(capitalGains.netGainIls).toFixed(2)} ש"ח. קיזוז הפסדים מול שנים/הכנסות אחרות אינו ממומש ב-MVP.`,
    );
  }
  if (dividends.foreignTaxWithheldIls > dividendGrossTaxIls) {
    notes.push(
      "המס הזר שנוכה גבוה מהמס הישראלי על הדיבידנד; עודף הזיכוי אינו מוחזר אוטומטית (כפוף לכללי זיכוי מס זר).",
    );
  }

  return {
    taxYear: input.taxYear,
    capitalGains,
    dividends,
    capitalGainsTaxIls,
    dividendGrossTaxIls,
    foreignTaxCreditIls,
    dividendNetTaxIls,
    investmentTaxIls,
    notes,
    warnings: [...capitalGains.warnings, ...dividends.warnings],
  };
}
