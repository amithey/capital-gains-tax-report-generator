import type { CurrencyCode, IsoDate, RateObservation, RateTable } from "./types";

/**
 * Fallback: בניית טבלת שערים מקובץ שמעלה המשתמש ידנית.
 *
 * פורמט נתמך — CSV עם שלוש עמודות: תאריך, מטבע, שער.
 *   2024-02-15,USD,3.74
 *   2024-03-01,EUR,4.01
 * שורת כותרת אופציונלית (תזוהה ותידלג אם אינה מכילה תאריך תקין).
 */
export function parseManualRatesCsv(content: string): RateTable {
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const byCurrency: Record<CurrencyCode, RateObservation[]> = {};

  for (const line of lines) {
    const parts = line.split(/[,;\t]/).map((p) => p.trim());
    if (parts.length < 3) continue;
    const [rawDate, rawCurrency, rawRate] = parts as [string, string, string];

    const date = normalizeDate(rawDate);
    const rate = Number(rawRate.replace(/,/g, ""));
    if (date === null || !Number.isFinite(rate)) {
      // שורת כותרת או שורה לא תקינה — מדלגים בשקט.
      continue;
    }
    const currency = rawCurrency.toUpperCase();
    (byCurrency[currency] ??= []).push({ date, rate });
  }

  const observations: Record<CurrencyCode, RateObservation[]> = {};
  for (const [currency, list] of Object.entries(byCurrency)) {
    observations[currency] = list.sort((a, b) =>
      a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
    );
  }

  return { base: "ILS", observations };
}

function normalizeDate(value: string): IsoDate | null {
  const v = value.trim();
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return v;
  // תמיכה גם ב-DD/MM/YYYY הנפוץ בישראל.
  const dmy = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  return null;
}
