import type { TextItem } from "./text-items";
import type { Form867, GainAtRate } from "./types";

/**
 * Parser לטופס 867 (רווח הון מברוקר ישראלי), מבוסס-מיקום.
 *
 * הטופס הוא טופס תקני של רשות המסים בעל פריסה קבועה, ולכן החילוץ מתבסס על
 * עוגנים יציבים (כותרות שיעורי מס "0%".."35%", קודי שדה "040"/"256", מזהה הטופס
 * "867") ועל גאומטריה (שורה לפי y, עמודת שיעור לפי x) — ולא על טקסט עברי
 * (שעלול להשתנות בין מנועי PDF). אומת מול קבצי 867 אמיתיים (שנות מס 2024 ו-2025).
 *
 * ⚠️ מיפוי השדות הוא הנחת עבודה לפי הטפסים שנבדקו וטעון אימות רו"ח. ⚠️
 */

const NUM_RE = /^-?[\d,]+(?:\.\d+)?$/;
const RATE_RE = /^(\d{1,2})%$/;

function toNumber(s: string): number | null {
  if (!NUM_RE.test(s)) return null;
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** כל הפריטים בעמוד נתון. */
function pageItems(items: readonly TextItem[], page: number): TextItem[] {
  return items.filter((it) => it.page === page);
}

/** פריטים מספריים בתוך תיבה (y בטווח, x בטווח). */
function numbersInBox(
  items: readonly TextItem[],
  yMin: number,
  yMax: number,
  xMin: number,
  xMax: number,
): { value: number; item: TextItem }[] {
  const out: { value: number; item: TextItem }[] = [];
  for (const it of items) {
    if (it.y < yMin || it.y > yMax) continue;
    if (it.x < xMin || it.x > xMax) continue;
    const v = toNumber(it.str);
    if (v !== null) out.push({ value: v, item: it });
  }
  return out;
}

interface RateColumn {
  readonly rate: number;
  readonly x: number;
}

/** מאתר את שורת כותרת שיעורי המס של חלק רווח ההון (מכילה 25% ו-35%). */
function findCapitalGainsRateHeader(items: TextItem[]): { y: number; columns: RateColumn[] } | null {
  const rateItems = items
    .map((it) => {
      const m = RATE_RE.exec(it.str);
      return m ? { rate: Number(m[1]) / 100, x: it.x, y: it.y } : null;
    })
    .filter((r): r is { rate: number; x: number; y: number } => r !== null);

  // קבץ לפי שורה (y מעוגל) ובחר שורה שמכילה 25% וגם 35% (ייחודי לחלק רווח ההון).
  const byRow = new Map<number, { rate: number; x: number }[]>();
  for (const r of rateItems) {
    const key = Math.round(r.y / 6) * 6;
    (byRow.get(key) ?? byRow.set(key, []).get(key)!).push({ rate: r.rate, x: r.x });
  }
  for (const [y, cols] of byRow) {
    const rates = new Set(cols.map((c) => c.rate));
    if (rates.has(0.25) && rates.has(0.35) && rates.has(0.2)) {
      return { y, columns: cols.sort((a, b) => a.x - b.x) };
    }
  }
  return null;
}

/** משייך סכום לעמודת השיעור הקרובה ביותר לפי x. */
function rateForX(columns: RateColumn[], x: number): number {
  let best = columns[0]!;
  let bestDist = Math.abs(columns[0]!.x - x);
  for (const c of columns) {
    const d = Math.abs(c.x - x);
    if (d < bestDist) {
      best = c;
      bestDist = d;
    }
  }
  return best.rate;
}

function extractYear(items: TextItem[]): number | null {
  // טוקן שנה (20xx) העליון ביותר; הפוטר מכיל "2023" אך נמוך יותר בעמוד.
  const years = items
    .filter((it) => /^20\d\d$/.test(it.str))
    .sort((a, b) => a.y - b.y);
  return years.length > 0 ? Number(years[0]!.str) : null;
}

function extractIdentity(items: TextItem[]): { withholdingFileId?: string; accountNumber?: string; taxpayerId?: string } {
  const nineDigit = items.filter((it) => /^\d{9}$/.test(it.str)).sort((a, b) => a.y - b.y);
  const sixDigit = items.filter((it) => /^\d{6}$/.test(it.str)).sort((a, b) => a.y - b.y);
  const result: { withholdingFileId?: string; accountNumber?: string; taxpayerId?: string } = {};
  if (nineDigit.length > 0) result.withholdingFileId = nineDigit[0]!.str; // עליון = תיק ניכויים
  if (nineDigit.length > 1) result.taxpayerId = nineDigit[nineDigit.length - 1]!.str; // תחתון = ת"ז
  if (sixDigit.length > 0) result.accountNumber = sixDigit[0]!.str;
  return result;
}

export function parse867(items: readonly TextItem[]): Form867 {
  const warnings: string[] = [];
  const p1 = pageItems(items, 1);

  if (!p1.some((it) => it.str === "867")) {
    throw new Error("הקובץ אינו מזוהה כטופס 867 (לא נמצא מזהה הטופס).");
  }

  const taxYear = extractYear(p1);
  if (taxYear === null) {
    throw new Error("לא זוהתה שנת המס בטופס 867.");
  }

  const header = findCapitalGainsRateHeader(p1);
  if (header === null) {
    throw new Error("לא זוהתה שורת שיעורי המס בחלק רווח ההון בטופס 867.");
  }

  // רווחים חייבים: השורה שמתחת לכותרת השיעורים (טווח y קצר), משויכים לעמודה לפי x.
  const gainItems = numbersInBox(p1, header.y + 8, header.y + 34, 30, 360);
  const gainsByRate: GainAtRate[] = gainItems.map((g) => ({
    rate: rateForX(header.columns, g.item.x),
    amountIls: g.value,
  }));

  // עוגני קודי שדה.
  const code040 = p1.find((it) => it.str === "040");
  const code256 = p1.find((it) => it.str === "256");

  // מחזור: על שורת קוד 256, ערך בעמודת הנתונים (x נמוך), לא הקודים עצמם.
  let turnoverIls = 0;
  if (code256) {
    const row = numbersInBox(p1, code256.y - 8, code256.y + 8, 180, 250);
    if (row.length > 0) turnoverIls = row.sort((a, b) => a.item.x - b.item.x)[0]!.value;
    else warnings.push("לא זוהה מחזור המכירות (שדה 256).");
  } else {
    warnings.push("לא נמצא קוד שדה 256 (מחזור מכירות).");
  }

  // מס שנוכה במקור (שדה 040): ערך בעמודת הנתונים על שורת הקוד; היעדר = 0.
  let capitalGainsTaxWithheldIls = 0;
  if (code040) {
    const row = numbersInBox(p1, code040.y - 10, code040.y + 6, 200, 300).filter((r) => r.item.str !== "040");
    if (row.length > 0) capitalGainsTaxWithheldIls = row[0]!.value;
  }

  // מספר עסקאות: בין שורת המחזור לשורת קוד 040, בעמודת הנתונים (x~241).
  let transactionsCount = 0;
  if (code256 && code040) {
    const row = numbersInBox(p1, code256.y + 12, code040.y - 12, 220, 260);
    if (row.length > 0) transactionsCount = Math.round(row[0]!.value);
  }

  // הפסדים ברי קיזוז: בין שורת הרווחים לשורת המחזור, בעמודת הנתונים. היעדר = 0.
  let offsettableLossesIls = 0;
  {
    const turnoverY = code256?.y ?? header.y + 190;
    const losses = numbersInBox(p1, header.y + 40, turnoverY - 12, 200, 260);
    if (losses.length > 0) offsettableLossesIls = losses[0]!.value;
  }

  // דיבידנד (חלק ג', עמוד 2 אם קיים): הכנסת דיבידנד ברוטו — הערך בשורה הראשונה
  // שמתחת לכותרת שיעורי הדיבידנד.
  let dividendGrossIls = 0;
  const p2 = pageItems(items, 2);
  if (p2.length > 0) {
    const divHeader = p2
      .map((it) => (RATE_RE.test(it.str) ? it : null))
      .filter((it): it is TextItem => it !== null);
    // שורת כותרת הדיבידנד מכילה 4% (ייחודי לדיבידנד מול רווח הון).
    const fourPct = divHeader.find((it) => it.str === "4%");
    if (fourPct) {
      const row = numbersInBox(p2, fourPct.y + 12, fourPct.y + 40, 120, 360);
      if (row.length > 0) dividendGrossIls = row.sort((a, b) => a.item.x - b.item.x)[0]!.value;
    }
  }

  if (gainsByRate.length === 0 && turnoverIls === 0) {
    warnings.push("לא חולצו נתוני רווח הון מהטופס — ייתכן שהפריסה שונה מהצפוי.");
  }

  return {
    taxYear,
    identity: extractIdentity(p1),
    gainsByRate,
    offsettableLossesIls,
    turnoverIls,
    transactionsCount,
    capitalGainsTaxWithheldIls,
    dividendGrossIls,
    warnings,
  };
}
