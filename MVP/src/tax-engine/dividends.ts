import type { RawDividend, RawWithholding } from "@/parsers";
import type { RateTable } from "@/rates";
import { resolveRate } from "@/rates";
import type { DividendLine, DividendsResult } from "./types";

/**
 * מנוע דיבידנדים + זיכוי מס זר.
 *
 * עקרונות (טעונים אימות רו"ח):
 * 1. כל דיבידנד מומר לשקל בשער יום התשלום.
 * 2. מס שנוכה במקור בחו"ל מומר לשקל בשער יום הניכוי, ונצבר בנפרד — הוא בר-זיכוי
 *    כנגד המס הישראלי על אותה הכנסה (זיכוי מס זר, סעיף 199–210 לפקודה). הזיכוי
 *    בפועל מחושב ברמת ה-annual-return, מול חבות המס על הדיבידנד.
 * 3. התאמת ניכוי לדיבידנד לפי נייר+תאריך לצורך תצוגה; ניכויים ללא התאמה עדיין
 *    נצברים בסכום הכולל.
 */
export function computeDividends(
  dividends: readonly RawDividend[],
  withholdings: readonly RawWithholding[],
  rates: RateTable,
): DividendsResult {
  const warnings: string[] = [];
  const lines: DividendLine[] = [];

  // מיפוי ניכויים לפי נייר+תאריך, להתאמה לדיבידנד המקביל.
  const withheldIlsByKey = new Map<string, number>();
  let totalWithheldIls = 0;
  for (const w of withholdings) {
    const r = resolveRate(rates, w.currency, w.date);
    if (r.fellBack) {
      warnings.push(
        `שער יום הניכוי ל-${w.symbol} בתאריך ${w.date} לא פורסם; נעשה שימוש בשער מ-${r.usedDate}.`,
      );
    }
    const ils = w.amount * r.rate;
    totalWithheldIls += ils;
    const key = `${w.symbol}|${w.date}`;
    withheldIlsByKey.set(key, (withheldIlsByKey.get(key) ?? 0) + ils);
  }

  let grossDividendIls = 0;
  for (const d of dividends) {
    const r = resolveRate(rates, d.currency, d.date);
    if (r.fellBack) {
      warnings.push(
        `שער יום הדיבידנד ל-${d.symbol} בתאריך ${d.date} לא פורסם; נעשה שימוש בשער מ-${r.usedDate}.`,
      );
    }
    const grossIls = d.grossAmount * r.rate;
    grossDividendIls += grossIls;
    const key = `${d.symbol}|${d.date}`;
    const withheldIls = withheldIlsByKey.get(key) ?? 0;
    lines.push({
      symbol: d.symbol,
      currency: d.currency,
      date: d.date,
      grossIls,
      withheldIls,
      rate: r.rate,
      rateDate: r.usedDate,
    });
  }

  return {
    lines,
    grossDividendIls,
    foreignTaxWithheldIls: totalWithheldIls,
    warnings,
  };
}
