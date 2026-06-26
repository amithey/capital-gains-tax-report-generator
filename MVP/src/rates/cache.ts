import type { RateObservation } from "./types";

/**
 * Cache מקומי (localStorage) לשערים שנמשכו, כדי לא לפנות שוב לבנק ישראל.
 * שערים היסטוריים אינם משתנים, ולכן cache לצמיתות בצד הלקוח תקין.
 * נכשל בשקט (מחזיר null / לא כותב) בסביבות ללא localStorage (SSR/בדיקות).
 */

const PREFIX = "boi-rates:";

export function readCache(key: string): readonly RateObservation[] | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return null;
    return JSON.parse(raw) as RateObservation[];
  } catch {
    return null;
  }
}

export function writeCache(key: string, observations: readonly RateObservation[]): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(PREFIX + key, JSON.stringify(observations));
  } catch {
    // מכסה חרג / מצב פרטי — מתעלמים, ה-cache אינו קריטי.
  }
}
