/**
 * זיהוי פורמט קלט. ב-MVP נתמך Flex Query XML בלבד; CSV יתווסף בהמשך מאחורי
 * אותו interface (parseActivity). מטרת המודול: להחזיר הודעת שגיאה ברורה בעברית
 * כשהקובץ אינו מזוהה, במקום כשל עמום בתוך ה-parser.
 */

export type InputFormat = "flex-xml" | "activity-csv" | "unknown";

/**
 * מזהה פורמט לפי שם הקובץ ותחילת התוכן (heuristic זול, בלי parse מלא).
 */
export function detectFormat(fileName: string, content: string): InputFormat {
  const head = content.slice(0, 4096);
  const lowerName = fileName.toLowerCase();

  if (/FlexQueryResponse/.test(head)) return "flex-xml";
  if (lowerName.endsWith(".xml") && /<\?xml/.test(head)) return "flex-xml";

  // זיהוי ראשוני ל-Activity CSV (טרם ממומש) — כותרות אופייניות של IBKR.
  if (lowerName.endsWith(".csv") || /^Statement,|^"Statement"/.test(head)) {
    return "activity-csv";
  }

  return "unknown";
}

export function unsupportedFormatError(format: InputFormat): Error {
  if (format === "activity-csv") {
    return new Error(
      "זוהה קובץ Activity Statement CSV — תמיכה בפורמט זה טרם מומשה. נא להעלות דוח Flex Query בפורמט XML.",
    );
  }
  return new Error(
    "פורמט הקובץ לא זוהה. נא להעלות דוח Flex Query של IBKR בפורמט XML (קובץ שמכיל FlexQueryResponse).",
  );
}
