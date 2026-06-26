import type { IsoDate, LotMatchingMethod } from "./types";

/**
 * התאמת lots (מכירה מול קניות). השיטה ניתנת להחלפה; FIFO היא ברירת המחדל.
 *
 * המודול מתאים לפי כמות בלבד ואגנוסטי ליחידת הערך. הקורא (capital-gains.ts)
 * בוחר את היחידה: כאן בסיס העלות מומר לשקלים כבר בשער יום הרכישה, כך ש-costPerUnit
 * הוא בשקלים. רגל המכירה מומרת בנפרד בשער יום המכירה בשכבה שמעל.
 */

/** lot רכישה פתוח. */
export interface OpenLot {
  readonly acquisitionDate: IsoDate;
  /** כמות שנותרה ב-lot. */
  quantity: number;
  /** בסיס עלות ליחידה בשקלים (כולל חלק יחסי מעמלת הקנייה), בשער יום הרכישה. */
  readonly costPerUnit: number;
  /** שער יום הרכישה ששימש (ILS ליחידת מטבע) + התאריך שממנו נלקח — לשקיפות בלבד. */
  readonly acquisitionRate: number;
  readonly acquisitionRateDate: IsoDate;
}

/** חלק מותאם: כמות שנמכרה מתוך lot מסוים. */
export interface MatchedChunk {
  readonly acquisitionDate: IsoDate;
  readonly quantity: number;
  readonly costPerUnit: number;
  readonly acquisitionRate: number;
  readonly acquisitionRateDate: IsoDate;
}

export interface MatchResult {
  readonly chunks: readonly MatchedChunk[];
  /** כמות שלא נמצאו לה lots (חוסר נתונים / מכירה בחסר). 0 אם הכול הותאם. */
  readonly unmatchedQuantity: number;
}

/**
 * צורך `quantity` יחידות מתוך ה-lots הפתוחים לפי השיטה הנבחרת, ומעדכן את
 * הכמויות שנותרו (mutation מכוון — ה-lots מתנהלים לאורך עיבוד כרונולוגי).
 */
export function matchLots(
  openLots: OpenLot[],
  quantity: number,
  method: LotMatchingMethod = "FIFO",
): MatchResult {
  switch (method) {
    case "FIFO":
      return matchFifo(openLots, quantity);
  }
}

function matchFifo(openLots: OpenLot[], quantity: number): MatchResult {
  const chunks: MatchedChunk[] = [];
  let remaining = quantity;

  // openLots כבר בסדר כרונולוגי (הישן ביותר ראשון) — FIFO צורך מההתחלה.
  for (const lot of openLots) {
    if (remaining <= 0) break;
    if (lot.quantity <= 0) continue;
    const take = Math.min(lot.quantity, remaining);
    chunks.push({
      acquisitionDate: lot.acquisitionDate,
      quantity: take,
      costPerUnit: lot.costPerUnit,
      acquisitionRate: lot.acquisitionRate,
      acquisitionRateDate: lot.acquisitionRateDate,
    });
    lot.quantity -= take;
    remaining -= take;
  }

  return { chunks, unmatchedQuantity: remaining > 1e-9 ? remaining : 0 };
}
