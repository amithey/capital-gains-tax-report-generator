/**
 * שערי חליפין יציגים (בנק ישראל). המודול אגנוסטי למקור: השערים יכולים להגיע
 * מ-API של בנק ישראל או מהעלאה ידנית, ושניהם מתמזגים ל-RateTable אחיד.
 */

export type CurrencyCode = string;
export type IsoDate = string;

/** תצפית שער בודדת: כמה ש"ח שווה יחידה אחת של המטבע בתאריך מסוים. */
export interface RateObservation {
  readonly date: IsoDate;
  /** ILS ליחידת מטבע. */
  readonly rate: number;
}

/**
 * טבלת שערים מול השקל. observations לכל מטבע ממוינות בסדר תאריך עולה.
 * השקל עצמו אינו נשמר כאן — הוא מקבל שער 1 ב-resolveRate.
 */
export interface RateTable {
  readonly base: "ILS";
  readonly observations: Readonly<Record<CurrencyCode, readonly RateObservation[]>>;
}

export interface ResolvedRate {
  /** השער ששימש להמרה (ILS ליחידה). */
  readonly rate: number;
  /** התאריך שממנו נלקח השער (= התאריך המבוקש, או יום הפרסום הקודם הקרוב ביותר). */
  readonly usedDate: IsoDate;
  /** האם נדרש fallback ליום מסחר קודם (אין פרסום בתאריך המבוקש — סופ"ש/חג). */
  readonly fellBack: boolean;
}
