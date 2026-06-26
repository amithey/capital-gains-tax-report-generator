import type { Form867 } from "@/parsers/form-867";
import { getTaxYearConfig } from "./config";

/**
 * ⚠️ הנחת עבודה, טעון אימות רו"ח. ⚠️
 *
 * חישוב מס מתוך טופס 867 (ברוקר ישראלי). הברוקר כבר חישב את הרווח/הפסד בשקלים,
 * ולכן כאן רק מיישמים: קיזוז הפסדים מול הרווחים, חישוב המס לפי שיעור כל מדרגה,
 * והשוואה למס שכבר נוכה במקור.
 *
 * קיזוז הפסדים: ההפסד בר-הקיזוז מקוזז תחילה כנגד הרווחים בשיעור המס הגבוה ביותר
 * (הטבה לנישום — מקטין קודם את החבות היקרה). זהו עיקרון מקובל; טעון אימות.
 */
export interface Form867TaxResult {
  readonly taxYear: number;
  readonly turnoverIls: number;
  readonly transactionsCount: number;
  /** סך רווח חייב לפני קיזוז. */
  readonly totalGainsIls: number;
  readonly offsettableLossesIls: number;
  /** רווח חייב נטו לאחר קיזוז הפסדים (לא שלילי). */
  readonly netTaxableGainIls: number;
  /** הפסד שנותר ללא קיזוז (להעברה לשנים הבאות — לא ממומש ב-MVP). */
  readonly carryForwardLossIls: number;
  /** מס רווח הון לאחר קיזוז. */
  readonly capitalGainsTaxDueIls: number;
  readonly capitalGainsTaxWithheldIls: number;
  /** יתרה: חיובי = חבות נוספת; שלילי = החזר. */
  readonly capitalGainsBalanceIls: number;
  readonly dividendGrossIls: number;
  readonly dividendTaxIls: number;
  readonly notes: readonly string[];
  readonly warnings: readonly string[];
}

export function computeFrom867(form: Form867): Form867TaxResult {
  const config = getTaxYearConfig(form.taxYear);

  const totalGainsIls = form.gainsByRate.reduce((s, g) => s + g.amountIls, 0);

  // קיזוז הפסדים מול הרווחים בשיעור הגבוה ביותר תחילה.
  const buckets = [...form.gainsByRate].sort((a, b) => b.rate - a.rate);
  let remainingLoss = form.offsettableLossesIls;
  let capitalGainsTaxDueIls = 0;
  for (const bucket of buckets) {
    const offset = Math.min(remainingLoss, bucket.amountIls);
    const taxable = bucket.amountIls - offset;
    remainingLoss -= offset;
    capitalGainsTaxDueIls += taxable * bucket.rate;
  }

  const netTaxableGainIls = Math.max(0, totalGainsIls - form.offsettableLossesIls);
  const capitalGainsBalanceIls = capitalGainsTaxDueIls - form.capitalGainsTaxWithheldIls;

  // דיבידנד: שיעור יחיד מה-config (25%). מס זר שנוכה אינו מחולץ מעמוד הדיבידנד ב-MVP.
  const dividendTaxIls = form.dividendGrossIls * config.capitalGains.individualRate;

  const notes: string[] = [
    config.capitalGains.note,
    "המס חושב על בסיס נתוני טופס 867 (הברוקר כבר חישב את הרווח/הפסד בשקלים).",
    "חישוב זה כולל הכנסות השקעה בלבד ואינו אומדן החזר/חבות סופי — חסרים משכורת (106), נקודות זיכוי וניכויים.",
  ];
  const warnings: string[] = [...form.warnings];
  if (remainingLoss > 0) {
    notes.push(`נותר הפסד בר-קיזוז של ${remainingLoss.toFixed(2)} ש"ח שלא קוזז (להעברה לשנים הבאות; לא ממומש ב-MVP).`);
  }
  if (form.dividendGrossIls > 0) {
    warnings.push("מס זר שנוכה על דיבידנד לא חולץ מעמוד הדיבידנד; ייתכן שמגיע זיכוי מס זר שיקטין את מס הדיבידנד.");
  }
  if (form.capitalGainsTaxWithheldIls > capitalGainsTaxDueIls) {
    notes.push("המס שנוכה במקור גבוה מהמס המחושב — ייתכן שמגיע החזר על הפרש זה.");
  }

  return {
    taxYear: form.taxYear,
    turnoverIls: form.turnoverIls,
    transactionsCount: form.transactionsCount,
    totalGainsIls,
    offsettableLossesIls: form.offsettableLossesIls,
    netTaxableGainIls,
    carryForwardLossIls: remainingLoss,
    capitalGainsTaxDueIls,
    capitalGainsTaxWithheldIls: form.capitalGainsTaxWithheldIls,
    capitalGainsBalanceIls,
    dividendGrossIls: form.dividendGrossIls,
    dividendTaxIls,
    notes,
    warnings,
  };
}
