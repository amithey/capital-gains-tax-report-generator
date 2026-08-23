import type { ParsedActivity } from "@/parsers";
import { fetchBoiRates, type RateTable } from "@/rates";
import { computeAnnualReturn, type AnnualTaxResult } from "@/tax-engine";

/** כל התאריכים בפעילות, לקביעת טווח משיכת השערים. */
function allDates(activity: ParsedActivity): string[] {
  return [
    ...activity.trades.map((t) => t.date),
    ...activity.dividends.map((d) => d.date),
    ...activity.withholdings.map((w) => w.date),
  ].filter((d) => d.length === 10);
}

/** המטבעות הזרים שבפעילות (ILS אינו דורש שער). */
export function foreignCurrencies(activity: ParsedActivity): string[] {
  const set = new Set<string>();
  for (const t of activity.trades) set.add(t.currency);
  for (const d of activity.dividends) set.add(d.currency);
  for (const w of activity.withholdings) set.add(w.currency);
  set.delete("ILS");
  return [...set];
}

/** טווח תאריכים למשיכה, עם ריפוד לאחור כדי שיהיה שער fallback לתחילת השנה. */
export function dateRange(activity: ParsedActivity): { start: string; end: string } | null {
  const dates = allDates(activity).sort();
  if (dates.length === 0) return null;
  const min = dates[0]!;
  const max = dates[dates.length - 1]!;
  const start = new Date(min);
  start.setDate(start.getDate() - 14);
  return { start: start.toISOString().slice(0, 10), end: max };
}

/** שנת המס הנגזרת מהפעילות — שנת המכירות הנפוצה ביותר (ברירת מחדל לבורר השנה). */
export function inferTaxYear(activity: ParsedActivity): number | null {
  const years = activity.trades.filter((t) => t.side === "SELL").map((t) => Number(t.date.slice(0, 4)));
  if (years.length === 0) {
    const any = allDates(activity)[0];
    return any ? Number(any.slice(0, 4)) : null;
  }
  const counts = new Map<number, number>();
  for (const y of years) counts.set(y, (counts.get(y) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]![0];
}

export interface ComputeOptions {
  readonly taxYear: number;
  readonly substantialShareholder: boolean;
  /** אם סופק — משתמשים בשערים אלה (העלאה ידנית) במקום למשוך מבנק ישראל. */
  readonly manualRates?: RateTable;
}

/** מושך שערים (או משתמש בידניים) ומריץ את החישוב השנתי. */
export async function computeReport(
  activity: ParsedActivity,
  options: ComputeOptions,
): Promise<AnnualTaxResult> {
  let rates: RateTable;
  if (options.manualRates) {
    rates = options.manualRates;
  } else {
    const range = dateRange(activity);
    if (range === null) {
      rates = { base: "ILS", observations: {} };
    } else {
      rates = await fetchBoiRates(foreignCurrencies(activity), range.start, range.end);
    }
  }

  return computeAnnualReturn({
    taxYear: options.taxYear,
    trades: activity.trades,
    dividends: activity.dividends,
    withholdings: activity.withholdings,
    rates,
    substantialShareholder: options.substantialShareholder,
  });
}
