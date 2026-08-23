import type { RateObservation } from "./types";

/**
 * Parser ל-CSV של בנק ישראל (Fusion Edge / SDMX).
 * עמודות רלוונטיות: TIME_PERIOD (תאריך YYYY-MM-DD) ו-OBS_VALUE (השער).
 * מבודד כאן כדי שיהיה ניתן לבדיקה בנפרד מה-fetch.
 */
export function parseBoiCsv(csv: string): RateObservation[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const header = (lines[0] ?? "").split(",").map((h) => h.trim());
  const dateIdx = header.indexOf("TIME_PERIOD");
  const valueIdx = header.indexOf("OBS_VALUE");
  if (dateIdx === -1 || valueIdx === -1) {
    throw new Error("פורמט CSV של בנק ישראל לא מזוהה (חסרות עמודות TIME_PERIOD/OBS_VALUE).");
  }

  const observations: RateObservation[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = (lines[i] ?? "").split(",");
    const date = cols[dateIdx]?.trim();
    const rate = Number(cols[valueIdx]?.trim());
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(rate)) {
      observations.push({ date, rate });
    }
  }

  observations.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return observations;
}

/** שם הסדרה ב-API של בנק ישראל עבור שער יציג של מטבע מול השקל. */
export function boiSeriesCode(currency: string): string {
  return `RER_${currency.toUpperCase()}_ILS`;
}
