import type { CurrencyCode, IsoDate, RateObservation, RateTable } from "./types";
import { readCache, writeCache } from "./cache";

/**
 * לקוח צד-לקוח למשיכת שערים יציגים דרך ה-proxy (/api/boi-rates).
 * משלב cache מקומי כדי לא למשוך שוב שערים שכבר נמשכו.
 */

interface BoiResponse {
  readonly currency: CurrencyCode;
  readonly observations: readonly RateObservation[];
}

/**
 * מושך שערים עבור רשימת מטבעות בטווח תאריכים ובונה RateTable.
 * ILS מדולג (שערו 1). מטבע שנכשל נמשך — נזרקת שגיאה עם שמו כדי שה-UI יציע
 * חלופה ידנית.
 */
export async function fetchBoiRates(
  currencies: readonly CurrencyCode[],
  start: IsoDate,
  end: IsoDate,
): Promise<RateTable> {
  const observations: Record<CurrencyCode, readonly RateObservation[]> = {};

  const unique = [...new Set(currencies)].filter((c) => c !== "ILS");
  for (const currency of unique) {
    const cacheKey = `${currency}:${start}:${end}`;
    const cached = readCache(cacheKey);
    if (cached !== null) {
      observations[currency] = cached;
      continue;
    }

    const params = new URLSearchParams({ currency, start, end });
    const res = await fetch(`/api/boi-rates?${params.toString()}`);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? `כשל במשיכת שערים עבור ${currency}.`);
    }
    const data = (await res.json()) as BoiResponse;
    observations[currency] = data.observations;
    writeCache(cacheKey, data.observations);
  }

  return { base: "ILS", observations };
}
