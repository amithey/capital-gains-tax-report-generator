import { getTaxYearConfig } from "./config";
import { getExpenseCategory } from "./expense-catalog";

/**
 * ⚠️ הנחת עבודה, טעון אימות רו"ח. ⚠️
 *
 * מנוע הכנסת עצמאי: מחזור ← הוצאות מוכרות ← ניכויים (פנסיה/השתלמות/ביטוח לאומי)
 * ← הכנסה חייבת מהעסק + סכומי זיכוי. *לא* מחשב כאן את המס עצמו — ההכנסה החייבת
 * מצטרפת להכנסה הממודרגת ב-refund.ts וחישוב המדרגות נעשה פעם אחת על הסך הכולל.
 *
 * מחוץ לתחום: הפסד עסקי (clamped ל-0 עם אזהרה), חישוב דמי ביטוח לאומי עצמם
 * (רק אפקט הניכוי שלהם ממוסה), מקדמות (נספרות כמס ששולם מראש בצד ההחזר).
 */

export interface ExpenseEntry {
  /** מזהה קטגוריה מ-EXPENSE_CATALOG. */
  readonly categoryId: string;
  /** סך ההוצאה השנתית בש"ח (לפני הכרה חלקית). */
  readonly amountIls: number;
  /** אחוז שימוש עסקי (0..100) — רלוונטי לקטגוריות proportional; דורס את ברירת המחדל. */
  readonly businessUsePercent?: number;
}

export interface SelfEmployedInput {
  readonly taxYear: number;
  /** סך ההכנסות (מחזור) מהעסק בש"ח, לפני הוצאות. */
  readonly businessRevenueIls: number;
  readonly expenses: readonly ExpenseEntry[];
  /** הפקדות עצמאי לקצבה (פנסיה) בשנת המס. */
  readonly pensionDepositIls?: number;
  /** הפקדות עצמאי לקרן השתלמות בשנת המס. */
  readonly studyFundDepositIls?: number;
  /** דמי ביטוח לאומי ששולמו (ללא דמי בריאות). */
  readonly nationalInsurancePaidIls?: number;
  /** מקדמות מס הכנסה ששולמו — מועבר ל-refund.ts כצד "מס ששולם". */
  readonly advancesPaidIls?: number;
}

export interface RecognizedExpenseLine {
  readonly categoryId: string;
  readonly label: string;
  readonly amountIls: number;
  /** שיעור ההכרה שהוחל בפועל (0..1). */
  readonly recognizedShare: number;
  readonly recognizedIls: number;
}

export interface SelfEmployedResult {
  readonly taxYear: number;
  readonly businessRevenueIls: number;
  readonly expenseLines: readonly RecognizedExpenseLine[];
  readonly recognizedExpensesIls: number;
  /** רווח עסקי לפני ניכויים אישיים (מחזור פחות הוצאות, לא שלילי). */
  readonly netBusinessProfitIls: number;
  /** ניכוי פנסיה (ס' 47) — מקטין הכנסה חייבת. */
  readonly pensionDeductionIls: number;
  /** זיכוי פנסיה (ס' 45א) — מקטין מס, מצטרף ל-otherCredits ב-refund. */
  readonly pensionCreditIls: number;
  /** ניכוי קרן השתלמות — מקטין הכנסה חייבת. */
  readonly studyFundDeductionIls: number;
  /** ניכוי 52% מדמי ביטוח לאומי — מקטין הכנסה חייבת. */
  readonly nationalInsuranceDeductionIls: number;
  /** ההכנסה החייבת מהעסק שמצטרפת למדרגות המס. */
  readonly taxableBusinessIncomeIls: number;
  /** מקדמות — לצד ה"מס ששולם" בחישוב ההחזר. */
  readonly advancesPaidIls: number;
  readonly warnings: readonly string[];
  readonly notes: readonly string[];
}

export function computeSelfEmployed(input: SelfEmployedInput): SelfEmployedResult {
  const config = getTaxYearConfig(input.taxYear);
  const se = config.selfEmployed;
  const warnings: string[] = [];
  const notes: string[] = [];

  // הוצאות מוכרות לפי הקטלוג.
  const expenseLines: RecognizedExpenseLine[] = input.expenses
    .filter((e) => e.amountIls > 0)
    .map((e) => {
      const cat = getExpenseCategory(e.categoryId);
      const label = cat?.label ?? e.categoryId;
      let share = cat?.recognizedShare ?? 1;
      if (cat?.kind === "proportional" && e.businessUsePercent !== undefined) {
        share = Math.min(100, Math.max(0, e.businessUsePercent)) / 100;
      }
      return {
        categoryId: e.categoryId,
        label,
        amountIls: e.amountIls,
        recognizedShare: share,
        recognizedIls: e.amountIls * share,
      };
    });
  const recognizedExpensesIls = expenseLines.reduce((s, l) => s + l.recognizedIls, 0);

  const rawProfit = input.businessRevenueIls - recognizedExpensesIls;
  if (rawProfit < 0) {
    warnings.push(
      "ההוצאות המוכרות גבוהות מההכנסות — הפסד עסקי. קיזוז הפסדים אינו נתמך במחשבון זה, " +
        "והרווח החייב נקבע ל-0. הפסד עסקי ניתן לקיזוז מול הכנסות אחרות — מומלץ להתייעץ עם רו\"ח.",
    );
  }
  const netBusinessProfitIls = Math.max(0, rawProfit);

  // ניכוי פנסיה (ס'47): עד 11% מההכנסה המזכה (הרווח, עד התקרה).
  const qualifyingIncome = Math.min(netBusinessProfitIls, se.pensionQualifyingIncomeCeilingIls);
  const pensionDeposit = input.pensionDepositIls ?? 0;
  const pensionDeductionCap = qualifyingIncome * se.pensionDeductionRate;
  const pensionDeductionIls = Math.min(pensionDeposit, pensionDeductionCap);

  // זיכוי פנסיה (ס'45א): 35% על חלק ההפקדה שמעבר לניכוי, עד 5.5% מההכנסה המזכה.
  const pensionCreditDepositCap = qualifyingIncome * se.pensionCreditDepositRate;
  const depositForCredit = Math.min(Math.max(0, pensionDeposit - pensionDeductionIls), pensionCreditDepositCap);
  const pensionCreditIls = depositForCredit * se.pensionCreditRate;
  if (pensionDeposit > pensionDeductionIls + depositForCredit) {
    notes.push(
      "חלק מהפקדות הפנסיה עבר את תקרות הניכוי והזיכוי לשנה זו ולא נכלל בהטבה. " +
        "פיצול ההפקדה בין ניכוי לזיכוי כאן מפושט — טעון אימות רו\"ח.",
    );
  }

  // ניכוי קרן השתלמות: עד 4.5% מההכנסה הקובעת (עד התקרה).
  const studyFundDeposit = input.studyFundDepositIls ?? 0;
  const studyFundIncomeBase = Math.min(netBusinessProfitIls, se.studyFundIncomeCeilingIls);
  const studyFundCap = studyFundIncomeBase * se.studyFundDeductionRate;
  const studyFundDeductionIls = Math.min(studyFundDeposit, studyFundCap);
  if (studyFundDeposit > studyFundDeductionIls) {
    notes.push("חלק מהפקדת קרן ההשתלמות מעל תקרת הניכוי — היתרה אינה מזכה בהטבת מס השנה.");
  }

  // ניכוי 52% מדמי ביטוח לאומי (ס'47א). דמי בריאות אינם מוכרים.
  const niPaid = input.nationalInsurancePaidIls ?? 0;
  const nationalInsuranceDeductionIls = niPaid * se.nationalInsuranceDeductibleShare;
  if (niPaid > 0) {
    notes.push(
      `הוכר ניכוי של ${Math.round(se.nationalInsuranceDeductibleShare * 100)}% מדמי הביטוח הלאומי ששולמו. ` +
        "ודאו שהסכום שהוזן אינו כולל דמי ביטוח בריאות (שאינם מוכרים).",
    );
  }

  const taxableBusinessIncomeIls = Math.max(
    0,
    netBusinessProfitIls - pensionDeductionIls - studyFundDeductionIls - nationalInsuranceDeductionIls,
  );

  notes.push(
    "המחשבון מכסה מס הכנסה בלבד — דמי ביטוח לאומי של עצמאי מחושבים ומוחזרים בנפרד מול המוסד לביטוח לאומי.",
  );

  return {
    taxYear: input.taxYear,
    businessRevenueIls: input.businessRevenueIls,
    expenseLines,
    recognizedExpensesIls,
    netBusinessProfitIls,
    pensionDeductionIls,
    pensionCreditIls,
    studyFundDeductionIls,
    nationalInsuranceDeductionIls,
    taxableBusinessIncomeIls,
    advancesPaidIls: input.advancesPaidIls ?? 0,
    warnings,
    notes,
  };
}
