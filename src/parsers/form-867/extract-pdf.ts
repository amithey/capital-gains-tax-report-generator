import type { TextItem } from "./text-items";

/**
 * מתאם pdf.js: ממיר PDF (ArrayBuffer) למערך TextItem מנורמל.
 * רץ בדפדפן בלבד (חילוץ client-side, ללא שליחת הקובץ לשרת).
 *
 * y מנורמל מלמעלה (viewport.height − transform[5]) כדי שיתאים ללוגיקת ה-parser.
 */
export async function extractTextItems(data: ArrayBuffer): Promise<TextItem[]> {
  const pdfjs = await import("pdfjs-dist");
  // טעינת ה-worker מתוך החבילה בדרך הסטנדרטית של bundler (webpack/Next מזהה
  // את התבנית new Worker(new URL(...)) וארוז את הקובץ).
  if (!pdfjs.GlobalWorkerOptions.workerPort && !pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerPort = new Worker(
      new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url),
      { type: "module" },
    );
  }

  const doc = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise;
  const items: TextItem[] = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    for (const it of content.items) {
      if (!("str" in it)) continue;
      const str = it.str.trim();
      if (str === "") continue;
      items.push({
        str,
        x: Math.round(it.transform[4]),
        y: Math.round(viewport.height - it.transform[5]),
        page: pageNum,
      });
    }
  }

  return items;
}
