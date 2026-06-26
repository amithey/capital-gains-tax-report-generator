import { detectFormat, unsupportedFormatError } from "./detect";
import { parseFlexQueryXml } from "./flex-xml";
import type { ParsedActivity } from "./types";

export type { ParsedActivity, RawTrade, RawDividend, RawWithholding } from "./types";
export { detectFormat } from "./detect";

/**
 * נקודת הכניסה הציבורית של שכבת ה-parsing.
 * מזהה את הפורמט ומפנה ל-parser המתאים, או זורק שגיאה ברורה אם לא נתמך.
 */
export function parseActivity(fileName: string, content: string): ParsedActivity {
  const format = detectFormat(fileName, content);
  switch (format) {
    case "flex-xml":
      return parseFlexQueryXml(content);
    case "activity-csv":
    case "unknown":
      throw unsupportedFormatError(format);
  }
}
