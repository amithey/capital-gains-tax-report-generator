import { getTaxYearConfig } from "./config";

/**
 * ⚠️ הנחת עבודה, טעון אימות רו"ח. ⚠️
 *
 * דירת מגורים מושכרת — השוואת שלושת מסלולי המיסוי:
 *  1. מסלול פטור (מלא/חלקי) — פטור עד התקרה החודשית; בין התקרה לכפל התקרה
 *     הפטור נשחק ("תקרה מתואמת") והיתרה ממוסה בשיעור שולי; מעל כפל — אין פטור.
 *  2. מסלול מופחת 10% (ס' 122) — על המחזור ברוטו, בלי הוצאות ובלי פחת.
 *  3. מסלול שולי — שכ"ד פחות הוצאות מוכרות ופחת, מצטרף להכנסה הממודרגת.
 *
 * המסלול השולי תלוי בשאר הכנסות היחיד, ולכן הפונקציה מקבלת context עם
 * taxOnAdditionalIncome — המס השולי שתוסיף תוספת הכנסה נתונה (refund.ts מספק).
 *
 * הכנסה פסיבית למי שטרם מלאו לו 60 ממוסה החל ממדרגת 31% (ס' 121) — מיושם
 * כרצפה על המס השולי.
 */

export type RentalTrackId = "exempt" | "flat10" | "marginal";

export interface RentalExpenses {
  /** ריבית (לא קרן!) על משכנתא ששימשה לרכישת הדירה. */
  readonly mortgageInterestIls?: number;
  /** תיקונים ואחזקה שוטפת (לא השבחה). */
  readonly repairsIls?: number;
  /** דמי ניהול / תיווך / עו"ד לחוזה. */
  readonly managementFeesIls?: number;
  /** ביטוח מבנה. */
  readonly insuranceIls?: number;
  /** הוצאות אחרות בייצור ההכנסה. */
  readonly otherIls?: number;
}

export interface RentalInput {
  readonly taxYear: number;
  /** שכר דירה חודשי ממוצע בש"ח. */
  readonly monthlyRentIls: number;
  /** מספר חודשי השכרה בשנה (1..12). */
  readonly monthsRented: number;
  readonly expenses?: RentalExpenses;
  /** שווי המבנה (ללא רכיב הקרקע) לחישוב פחת במסלול השולי. */
  readonly depreciationBasisIls?: number;
  /** שיעור פחת שנתי (0..1). ברירת מחדל מהקונפיג (2%). */
  readonly depreciationRate?: number;
  /** האם מלאו ליחיד 60 בשנת המס (משפיע על רצפת ה-31%). */
  readonly age60OrOlder?: boolean;
  /** מס ששולם כבר על השכירות השנה (למשל תשלום 10% במסלול המופחת). */
  readonly taxAlreadyPaidIls?: number;
}

export interface RentalTrackResult {
  readonly track: RentalTrackId;
  readonly label: string;
  /** האם המסלול זמין לנתונים אלה (פטור לא זמין מעל כפל התקרה). */
  readonly available: boolean;
  /** ההכנסה החייבת במסלול (החלק הממוסה בלבד). */
  readonly taxableIncomeIls: number;
  /** אומדן המס במסלול. */
  readonly taxIls: number;
  /** הסבר בעברית פשוטה על המסלול והתוצאה. */
  readonly explanation: string;
}

export interface RentalComparison {
  readonly taxYear: number;
  readonly annualRentIls: number;
  readonly tracks: readonly RentalTrackResult[];
  readonly recommendedTrack: RentalTrackId;
  /** ההכנסה החייבת אם נבחר המסלול השולי (לצירוף למדרגות ב-refund). */
  readonly marginalTrackTaxableIncomeIls: number;
  readonly taxAlreadyPaidIls: number;
  readonly warnings: readonly string[];
  readonly notes: readonly string[];
}

export interface RentalTaxContext {
  /** מס שולי על תוספת הכנסה ממודרגת מעל ההכנסה הקיימת של היחיד. */
  taxOnAdditionalIncome(amountIls: number): number;
}

/** סך ההוצאות המוכרות במסלול השולי (כולל פחת). */
function marginalExpenses(input: RentalInput, defaultDepreciationRate: number): number {
  const e = input.expenses ?? {};
  const depRate = input.depreciationRate ?? defaultDepreciationRate;
  const depreciation = (input.depreciationBasisIls ?? 0) * depRate;
  return (
    (e.mortgageInterestIls ?? 0) +
    (e.repairsIls ?? 0) +
    (e.managementFeesIls ?? 0) +
    (e.insuranceIls ?? 0) +
    (e.otherIls ?? 0) +
    depreciation
  );
}

export function compareRentalTracks(input: RentalInput, ctx: RentalTaxContext): RentalComparison {
  const config = getTaxYearConfig(input.taxYear);
  const rc = config.rental;
  const warnings: string[] = [];
  const notes: string[] = [];

  const months = Math.min(12, Math.max(1, input.monthsRented));
  const annualRentIls = input.monthlyRentIls * months;
  const cap = rc.monthlyExemptionCapIls;

  // רצפת 31% להכנסה פסיבית מתחת לגיל 60: המס השולי לא יפחת מ-31% על התוספת.
  const passiveMarginalTax = (amount: number): number => {
    if (amount <= 0) return 0;
    const bracketTax = ctx.taxOnAdditionalIncome(amount);
    if (input.age60OrOlder) return bracketTax;
    return Math.max(bracketTax, amount * rc.passiveIncomeMinMarginalRate);
  };

  // --- מסלול פטור (מלא/חלקי) ---
  let exemptResult: RentalTrackResult;
  if (input.monthlyRentIls <= cap) {
    exemptResult = {
      track: "exempt",
      label: "מסלול פטור מלא",
      available: true,
      taxableIncomeIls: 0,
      taxIls: 0,
      explanation:
        `שכר הדירה החודשי (${Math.round(input.monthlyRentIls).toLocaleString()} ₪) אינו עולה על תקרת הפטור ` +
        `(${cap.toLocaleString()} ₪) — כל ההכנסה פטורה ממס.`,
    };
  } else if (input.monthlyRentIls <= cap * 2) {
    // פטור חלקי: תקרה מתואמת = תקרה פחות החריגה; היתרה ממוסה בשיעור שולי.
    const excess = input.monthlyRentIls - cap;
    const adjustedCap = cap - excess;
    const taxableMonthly = input.monthlyRentIls - adjustedCap;
    const taxableAnnual = taxableMonthly * months;
    // הוצאות מוכרות כנגד החלק החייב בלבד, באופן יחסי — פישוט, טעון אימות.
    const expShare = taxableMonthly / input.monthlyRentIls;
    const expenses = marginalExpenses(input, rc.depreciationRateDefault) * expShare;
    const taxableAfterExpenses = Math.max(0, taxableAnnual - expenses);
    const tax = passiveMarginalTax(taxableAfterExpenses);
    warnings.push(
      "חישוב הפטור החלקי (תקרה מתואמת + ייחוס הוצאות יחסי לחלק החייב) מפושט וטעון אימות רו\"ח — " +
        "זהו אחד החישובים העדינים בתחום.",
    );
    exemptResult = {
      track: "exempt",
      label: "מסלול פטור חלקי",
      available: true,
      taxableIncomeIls: taxableAfterExpenses,
      taxIls: tax,
      explanation:
        `שכר הדירה מעל התקרה אך מתחת לכפל — הפטור נשחק: התקרה המתואמת היא ` +
        `${Math.round(adjustedCap).toLocaleString()} ₪ לחודש, והיתרה ממוסה בשיעור השולי.`,
    };
  } else {
    exemptResult = {
      track: "exempt",
      label: "מסלול פטור",
      available: false,
      taxableIncomeIls: 0,
      taxIls: Infinity,
      explanation:
        `שכר הדירה החודשי עולה על כפל תקרת הפטור (${(cap * 2).toLocaleString()} ₪) — מסלול הפטור אינו זמין.`,
    };
  }

  // --- מסלול 10% ---
  const flatTax = annualRentIls * rc.flatTrackRate;
  const flatResult: RentalTrackResult = {
    track: "flat10",
    label: "מסלול מופחת 10%",
    available: true,
    taxableIncomeIls: annualRentIls,
    taxIls: flatTax,
    explanation:
      `מס של ${Math.round(rc.flatTrackRate * 100)}% על מלוא שכר הדירה ברוטו (${Math.round(annualRentIls).toLocaleString()} ₪), ` +
      "ללא ניכוי הוצאות או פחת. פשוט ונוח כשההוצאות נמוכות.",
  };

  // --- מסלול שולי ---
  const expensesTotal = marginalExpenses(input, rc.depreciationRateDefault);
  const rawMarginalTaxable = annualRentIls - expensesTotal;
  if (rawMarginalTaxable < 0) {
    warnings.push(
      "במסלול השולי ההוצאות גבוהות מההכנסה — הפסד משכירות. קיזוז הפסדים אינו נתמך והחבות נקבעה ל-0.",
    );
  }
  const marginalTaxable = Math.max(0, rawMarginalTaxable);
  const marginalTax = passiveMarginalTax(marginalTaxable);
  const marginalResult: RentalTrackResult = {
    track: "marginal",
    label: "מסלול מס שולי",
    available: true,
    taxableIncomeIls: marginalTaxable,
    taxIls: marginalTax,
    explanation:
      `שכר הדירה פחות הוצאות מוכרות ופחת (${Math.round(expensesTotal).toLocaleString()} ₪) מצטרף ליתר ההכנסות ` +
      `וממוסה במדרגות${input.age60OrOlder ? "" : " (לפני גיל 60 — לפחות 31%)"}. משתלם כשההוצאות גבוהות.`,
  };

  const tracks = [exemptResult, flatResult, marginalResult];
  const recommendedTrack = tracks
    .filter((t) => t.available)
    .reduce((best, t) => (t.taxIls < best.taxIls ? t : best)).track;

  if (input.depreciationBasisIls && input.depreciationBasisIls > 0) {
    notes.push(
      "שימו לב: פחת שנדרש (במסלול השולי) — וגם פחת רעיוני במסלול 10% — מקטין את עלות הרכישה " +
        "לצורך מס שבח במכירת הדירה. כדאי לשקלל זאת בבחירת המסלול.",
    );
  }
  notes.push(
    "במסלול 10% התשלום מתבצע בדרך כלל באופן עצמאי עד 30 בינואר של השנה העוקבת. " +
      "הבחירה במסלול היא שנתית — אפשר לבחון מחדש כל שנה.",
  );

  return {
    taxYear: input.taxYear,
    annualRentIls,
    tracks,
    recommendedTrack,
    marginalTrackTaxableIncomeIls: marginalTaxable,
    taxAlreadyPaidIls: input.taxAlreadyPaidIls ?? 0,
    warnings,
    notes,
  };
}
