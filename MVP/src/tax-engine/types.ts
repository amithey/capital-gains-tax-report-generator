/**
 * ⚠️ כללי המס במנוע זה הם הנחת עבודה ראשונית וטעונים אימות רו"ח לפני שימוש בפרודקשן. ⚠️
 *
 * מבני התוצאה של מנוע המס. כל הסכומים הסופיים בשקלים (ILS), שכן הדיווח לרשות
 * המסים בישראל הוא בשקלים. שדות עזר (שערים, מטבע מקור) נשמרים לשקיפות ולאימות.
 */

export type CurrencyCode = string;
export type IsoDate = string;

/** שיטות התאמת lots להחלפה. FIFO היא ברירת המחדל. */
export type LotMatchingMethod = "FIFO";

/**
 * שורת מימוש בודדת: התאמה של מכירה אחת מול lot רכישה אחד.
 * מכירה אחת עשויה להתפצל לכמה שורות (כשהיא מכסה כמה lots).
 */
export interface DisposalLine {
  readonly symbol: string;
  readonly currency: CurrencyCode;
  readonly acquisitionDate: IsoDate;
  readonly saleDate: IsoDate;
  readonly quantity: number;
  /** בסיס עלות בשקלים (כולל עמלת קנייה), בשער יום הרכישה. */
  readonly costBasisIls: number;
  /** תמורת מכירה בשקלים (בניכוי עמלת מכירה), בשער יום המכירה. */
  readonly proceedsIls: number;
  /** רווח/הפסד הון בשקלים (תמורה − בסיס). שלילי = הפסד. */
  readonly gainIls: number;
  /** שער יום הרכישה ששימש (ILS ליחידת מטבע) + התאריך שממנו נלקח. */
  readonly acquisitionRate: number;
  readonly acquisitionRateDate: IsoDate;
  /** שער יום המכירה ששימש + התאריך שממנו נלקח. */
  readonly saleRate: number;
  readonly saleRateDate: IsoDate;
}

export interface CapitalGainsResult {
  readonly lines: readonly DisposalLine[];
  readonly totalProceedsIls: number;
  readonly totalCostBasisIls: number;
  /** סך רווח/הפסד נטו (יכול להיות שלילי). */
  readonly netGainIls: number;
  /** סך הרווחים בלבד (חלקים חיוביים). */
  readonly totalGainsIls: number;
  /** סך ההפסדים בלבד (כערך חיובי). */
  readonly totalLossesIls: number;
  readonly warnings: readonly string[];
}

/** סיכום דיבידנדים + זיכוי מס זר. */
export interface DividendsResult {
  readonly lines: readonly DividendLine[];
  /** סך הכנסת דיבידנד ברוטו בשקלים. */
  readonly grossDividendIls: number;
  /** סך מס זר שנוכה במקור בשקלים — בר-זיכוי כנגד המס הישראלי (זיכוי מס זר). */
  readonly foreignTaxWithheldIls: number;
  readonly warnings: readonly string[];
}

export interface DividendLine {
  readonly symbol: string;
  readonly currency: CurrencyCode;
  readonly date: IsoDate;
  readonly grossIls: number;
  readonly withheldIls: number;
  readonly rate: number;
  readonly rateDate: IsoDate;
}

/**
 * תוצאת החישוב השנתי המאוחד.
 *
 * Phase 2: מכסה הכנסות השקעה בלבד (רווחי הון + דיבידנדים). שדות המשכורת
 * ונקודות הזיכוי שמורים למודול המשכורת (Phase 3) — לכן עדיין *אין* כאן סכום
 * החזר/חבות סופי לשכיר. `notes` מתעד מה כלול ומה חסר.
 */
export interface AnnualTaxResult {
  readonly taxYear: number;
  readonly capitalGains: CapitalGainsResult;
  readonly dividends: DividendsResult;
  /** מס על רווח הון נטו (0 אם נטו שלילי — הפסד אינו יוצר מס). */
  readonly capitalGainsTaxIls: number;
  /** מס ישראלי על דיבידנד ברוטו, לפני זיכוי מס זר. */
  readonly dividendGrossTaxIls: number;
  /** מס זר בר-זיכוי שנוצל בפועל (מוגבל לגובה המס הישראלי על הדיבידנד). */
  readonly foreignTaxCreditIls: number;
  /** מס על דיבידנד לאחר זיכוי מס זר (לא פחות מ-0). */
  readonly dividendNetTaxIls: number;
  /** סך מס על הכנסות ההשקעה (רווח הון + דיבידנד נטו). */
  readonly investmentTaxIls: number;
  readonly notes: readonly string[];
  readonly warnings: readonly string[];
}
