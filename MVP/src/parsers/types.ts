/**
 * מבני ביניים נקיים (broker-agnostic).
 *
 * אלה המבנים שמנוע המס (tax-engine) צורך. ה-parsers ממירים את הפורמט הגולמי
 * של IBKR (Flex Query XML / Activity CSV) למבנים האלה, ומנוע המס אינו יודע
 * דבר על מקור הנתונים. כל שדה כספי נשמר במטבע המקורי של העסקה — ההמרה לשקל
 * מתבצעת בשלב מאוחר יותר (rates + tax-engine), לא כאן.
 */

/** מטבע במחרוזת ISO-4217 (למשל "USD", "EUR", "ILS"). לא מצומצם ל-enum כדי לסבול מטבעות לא צפויים מהקלט. */
export type CurrencyCode = string;

/** תאריך בפורמט ISO 8601 (YYYY-MM-DD), ללא שעה — מספיק לצורך שער יציג יומי. */
export type IsoDate = string;

export type TradeSide = "BUY" | "SELL";

/**
 * עסקת קנייה/מכירה בודדת.
 *
 * הסכומים הם במטבע ה-`currency`. `quantity` תמיד חיובי; הכיוון נקבע ב-`side`.
 * `proceeds` הוא הסכום ברוטו (כמות × מחיר) לפני עמלה, כפי שמדווח ב-IBKR — שמירתו
 * בנפרד מהעמלה מאפשרת למנוע המס לגלגל עמלות לבסיס/לתמורה בשקיפות.
 */
export interface RawTrade {
  /** מזהה מקור מ-IBKR (transactionID) אם קיים — לצורך debug ומניעת כפילויות. */
  readonly sourceId?: string;
  readonly side: TradeSide;
  /** סימול הנייר (symbol). */
  readonly symbol: string;
  /** שם מלא של הנייר אם זמין. */
  readonly description?: string;
  /** סוג נכס מ-IBKR (STK, OPT, FUT וכו') — נשמר כמטא-דאטה, לא משפיע על חישוב ב-MVP. */
  readonly assetCategory?: string;
  /** תאריך העסקה (trade date). */
  readonly date: IsoDate;
  /** כמות (תמיד חיובי). */
  readonly quantity: number;
  /** מחיר ליחידה במטבע העסקה. */
  readonly price: number;
  /** סכום ברוטו (חיובי) במטבע העסקה, לפני עמלה. */
  readonly proceeds: number;
  /** עמלה (מוחזרת כערך חיובי = עלות העמלה) במטבע העסקה. */
  readonly commission: number;
  readonly currency: CurrencyCode;
}

/**
 * דיבידנד שהתקבל.
 *
 * `grossAmount` הוא הסכום לפני ניכוי מס במקור. מס שנוכה במקור מיוצג בנפרד
 * ב-RawWithholding כדי לאפשר מעקב לצורך זיכוי מס זר.
 */
export interface RawDividend {
  readonly sourceId?: string;
  readonly symbol: string;
  readonly description?: string;
  /** תאריך התשלום (payDate / settleDate). */
  readonly date: IsoDate;
  /** סכום הדיבידנד ברוטו (חיובי) במטבע. */
  readonly grossAmount: number;
  readonly currency: CurrencyCode;
}

/**
 * מס שנוכה במקור (Withholding Tax).
 *
 * ב-IBKR זה מופיע כשורת CashTransaction נפרדת בסכום שלילי. אנו שומרים אותו
 * כערך חיובי (= סכום המס שנוכה) ומקשרים לנייר/תאריך כדי שמנוע המס יוכל להתאים
 * אותו לדיבידנד הרלוונטי.
 */
export interface RawWithholding {
  readonly sourceId?: string;
  readonly symbol: string;
  readonly description?: string;
  readonly date: IsoDate;
  /** סכום המס שנוכה (חיובי) במטבע. */
  readonly amount: number;
  readonly currency: CurrencyCode;
}

/**
 * תוצאת parse מלאה של דוח מתווך — מבנה אחיד שכל parser מחזיר.
 */
export interface ParsedActivity {
  readonly trades: readonly RawTrade[];
  readonly dividends: readonly RawDividend[];
  readonly withholdings: readonly RawWithholding[];
  /**
   * מטבעות הבסיס של החשבון כפי שזוהו בקלט (אם דווחו). אינפורמטיבי בלבד.
   */
  readonly accountCurrencies?: readonly CurrencyCode[];
  /**
   * אזהרות לא-חוסמות שנאספו במהלך ה-parse (שורות שדולגו, שדות חסרים וכו').
   * מוצגות למשתמש כדי שיוכל לאמת שהקלט נקרא במלואו.
   */
  readonly warnings: readonly string[];
}
