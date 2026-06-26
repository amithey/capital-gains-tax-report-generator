/**
 * מודל נתונים לטופס 867 — "אישור ניכוי מס במקור על רווח הון" שמנפיק ברוקר ישראלי.
 *
 * שלא כמו דוח עסקאות גולמי (Flex Query), בטופס 867 הברוקר **כבר חישב הכול בשקלים**:
 * רווח חייב לפי שיעור מס, הפסד בר-קיזוז, מחזור, מספר עסקאות, ומס שנוכה במקור.
 * לכן אין צורך ב-FIFO או בשערי חליפין — רק לחלץ ולשבץ בדוח השנתי (1322/1301).
 *
 * כל הסכומים בשקלים.
 */

/** רווח חייב במס המשויך לשיעור מס מסוים (עמודות 0%/15%/20%/25%/35% בטופס). */
export interface GainAtRate {
  /** שיעור המס (0..1), למשל 0.25. */
  readonly rate: number;
  /** סכום הרווח החייב בשקלים תחת שיעור זה. */
  readonly amountIls: number;
}

/** נתוני זיהוי מהטופס. נשמרים client-side בלבד (PII) ואינם נשלחים/נרשמים בשרת. */
export interface Form867Identity {
  /** מספר תיק ניכויים של הברוקר. */
  readonly withholdingFileId?: string;
  /** מספר חשבון אצל הברוקר. */
  readonly accountNumber?: string;
  /** מספר זהות של הנישום. */
  readonly taxpayerId?: string;
}

export interface Form867 {
  readonly taxYear: number;
  readonly identity: Form867Identity;
  /** רווחים חייבים לפי שיעור מס (חלק ד', רווח הון). */
  readonly gainsByRate: readonly GainAtRate[];
  /** הפסדים ברי-קיזוז בשקלים (יועברו לנספח ג'). */
  readonly offsettableLossesIls: number;
  /** מחזור מכירות כולל בשקלים. */
  readonly turnoverIls: number;
  /** מספר עסקאות. */
  readonly transactionsCount: number;
  /** מס שנוכה במקור על רווח ההון (שדה 040). */
  readonly capitalGainsTaxWithheldIls: number;
  /** הכנסת דיבידנד ברוטו בשקלים (חלק ג', אם קיים בטופס). */
  readonly dividendGrossIls: number;
  /** אזהרות חילוץ (שדה חסר/לא ודאי) — מוצגות למשתמש לאימות. */
  readonly warnings: readonly string[];
}
