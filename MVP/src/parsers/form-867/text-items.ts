/**
 * פריט טקסט מנורמל מתוך PDF: מחרוזת + מיקום (x מימין-לשמאל, y מלמעלה-למטה) + מספר עמוד.
 * ה-parser (parse-867) עובד על המבנה הזה בלבד, כך שהוא טהור וניתן לבדיקה ללא PDF אמיתי.
 * המתאם ל-pdf.js (extract-pdf) ממיר את פלט הספרייה למבנה הזה.
 */
export interface TextItem {
  readonly str: string;
  /** מיקום אופקי (נקודות PDF). */
  readonly x: number;
  /** מיקום אנכי מנורמל מלמעלה (גדל כלפי מטה). */
  readonly y: number;
  readonly page: number;
}
