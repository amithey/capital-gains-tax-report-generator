import type { CurrencyCode, IsoDate, RateTable, ResolvedRate } from "./types";

/**
 * מאתר את השער היציג להמרת מטבע לשקל בתאריך נתון.
 *
 * כלל ה-fallback: בנק ישראל מפרסם שער יציג בימי מסחר בלבד. אם בתאריך המבוקש
 * אין פרסום (סוף שבוע / חג), נלקח השער היציג האחרון שפורסם *לפניו* — בהתאם
 * לנוהג המקובל לצורכי מס. (טעון אימות רו"ח.)
 *
 * השקל מקבל שער 1.0 ללא צורך בטבלה.
 * זורק שגיאה אם אין אף תצפית מתאימה (לא בתאריך ולא לפניו).
 */
export function resolveRate(
  table: RateTable,
  currency: CurrencyCode,
  date: IsoDate,
): ResolvedRate {
  if (currency === "ILS") {
    return { rate: 1, usedDate: date, fellBack: false };
  }

  const observations = table.observations[currency];
  if (observations === undefined || observations.length === 0) {
    throw new Error(`אין שערי חליפין זמינים עבור המטבע ${currency}.`);
  }

  // התצפיות ממוינות בסדר עולה. מחפשים את התצפית האחרונה עם date <= המבוקש.
  let best: { date: IsoDate; rate: number } | null = null;
  for (const obs of observations) {
    if (obs.date <= date) {
      best = obs;
    } else {
      break;
    }
  }

  if (best === null) {
    throw new Error(
      `אין שער יציג ל-${currency} בתאריך ${date} או לפניו. ייתכן שטווח השערים שנמשך אינו מכסה תאריך זה.`,
    );
  }

  return {
    rate: best.rate,
    usedDate: best.date,
    fellBack: best.date !== date,
  };
}

/** ממזג כמה מקורות שערים לטבלה אחת (למשל בנק ישראל + השלמות ידניות). */
export function mergeRateTables(...tables: readonly RateTable[]): RateTable {
  const merged: Record<CurrencyCode, RateObservationMutable[]> = {};

  for (const table of tables) {
    for (const [currency, observations] of Object.entries(table.observations)) {
      const target = (merged[currency] ??= []);
      for (const obs of observations) {
        target.push({ date: obs.date, rate: obs.rate });
      }
    }
  }

  const observations: Record<CurrencyCode, RateObservationMutable[]> = {};
  for (const [currency, list] of Object.entries(merged)) {
    // dedup לפי תאריך (המקור המאוחר ברשימה גובר) + מיון עולה.
    const byDate = new Map<IsoDate, number>();
    for (const obs of list) byDate.set(obs.date, obs.rate);
    observations[currency] = [...byDate.entries()]
      .map(([date, rate]) => ({ date, rate }))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }

  return { base: "ILS", observations };
}

interface RateObservationMutable {
  date: IsoDate;
  rate: number;
}
