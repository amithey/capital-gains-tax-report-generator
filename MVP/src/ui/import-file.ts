import { parseActivity, type ParsedActivity } from "@/parsers";
import { extractTextItems, parse867, type Form867 } from "@/parsers/form-867";

/**
 * שלב יבוא מאוחד: מזהה את סוג הקובץ ומנתב.
 * - PDF → טופס 867 (ברוקר ישראלי): הברוקר כבר חישב; רק מחלצים.
 * - XML → Flex Query (ברוקר זר): עסקאות גולמיות שיחושבו במנוע.
 * החילוץ כולו מתבצע בדפדפן (client-side), הקובץ אינו נשלח לשרת.
 */
export type ImportResult =
  | { readonly kind: "flex"; readonly activity: ParsedActivity }
  | { readonly kind: "867"; readonly form: Form867 };

export async function importFile(file: File): Promise<ImportResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const buffer = await file.arrayBuffer();
    const items = await extractTextItems(buffer);
    return { kind: "867", form: parse867(items) };
  }
  const content = await file.text();
  return { kind: "flex", activity: parseActivity(file.name, content) };
}
