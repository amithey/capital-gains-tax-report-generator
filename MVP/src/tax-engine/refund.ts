import { getTaxYearConfig } from "./config";
import { creditPointsValue, incomeTaxOnBrackets } from "./salary";
import { compareRentalTracks, type RentalComparison, type RentalInput, type RentalTrackId } from "./rental";
import type { SelfEmployedResult } from "./self-employed";
import type { Form867TaxResult } from "./form-867-return";
import type { AnnualTaxResult } from "./types";

/**
 * ⚠️ הנחת עבודה, טעון אימות רו"ח. ⚠️
 *
 * מנוע ההחזר המאוחד — לב המוצר. מאחד הכנסה ממשכורת (טופס 106, אפשר ריבוי מעסיקים),
 * הכנסה מעסק (עצמאי), הכנסה משכירות (לפי מסלול), ומס על הכנסות השקעה (867/ברוקר זר);
 * משווה את החבות הכוללת למס שכבר נוכה/שולם, ומחזיר את אומדן ההחזר.
 *
 * עיקרון מרכזי (וזה מקור ההחזר הנפוץ): המס מחושב מחדש על *סך* ההכנסה השנתית
 * ומול *סך* נקודות הזיכוי של היחיד. כשהיו כמה מעסיקים, כל אחד ניכה בנפרד ולעיתים
 * בשיעור גבוה מדי — וההפרש חוזר.
 *
 * מבנה החישוב: הכנסה "ממודרגת" (משכורת + רווח עסקי חייב) מחושבת פעם אחת במדרגות;
 * שכירות ומס השקעות מתווספים כסכומי מס (השכירות מחושבת עם context של המדרגות,
 * כך שהמסלול השולי משקף את מיקום היחיד במדרגות). מס יסף מחושב על ההכנסה הכוללת.
 *
 * תומך בקלט חלקי: מחשב את הטוב ביותר עם מה שיש, ומציין ב-`missing` מה חסר ומה
 * היה משנה את התוצאה.
 */

export interface EmployerIncome {
  readonly taxableIncomeIls: number;
  readonly taxWithheldIls: number;
  readonly employerName?: string;
}

/** זיכויים/ניכויים ברמת היחיד (מסכומי טופס 106). */
export interface SalaryCreditsInput {
  /** הפקדות עובד לקצבה (זיכוי 45א). */
  readonly pensionEmployeeIls?: number;
  /** פרמיות ביטוח חיים. */
  readonly lifeInsuranceIls?: number;
  /** תרומות למוסד מוכר (זיכוי 46). */
  readonly donationsIls?: number;
}

/** מס על הכנסות השקעה, מנורמל ממקור כלשהו (867 / ברוקר זר). */
export interface InvestmentTaxInput {
  readonly capitalGainsTaxDueIls: number;
  readonly capitalGainsTaxWithheldIls: number;
  readonly dividendTaxDueIls: number;
  readonly dividendTaxWithheldIls: number;
  /** ההכנסה החייבת מהשקעות (רווח הון נטו + דיבידנד ברוטו) — לחישוב מס יסף בלבד. */
  readonly taxableIncomeIls?: number;
}

/** קלט שכירות: נתוני הדירה + מסלול נבחר (ברירת מחדל: המסלול המומלץ). */
export interface RentalRefundInput extends RentalInput {
  readonly chosenTrack?: RentalTrackId;
}

/** שורת פירוט לפי מקור הכנסה — למסך התוצאות ול-PDF. */
export interface RefundSourceLine {
  readonly id: "salary" | "business" | "other" | "investment" | "rental" | "surtax";
  readonly label: string;
  readonly taxableIncomeIls?: number;
  readonly taxIls: number;
  readonly withheldIls: number;
}

/** הכנסה חייבת נוספת שאינה משכר/עסק — קצבה, פנסיה, דמי אבטלה/לידה וכד'. */
export interface OtherIncomeInput {
  /** הכנסה חייבת שמצטרפת למדרגות המס. */
  readonly taxableIls: number;
  /** מס שכבר נוכה מההכנסה הזו. */
  readonly withheldIls: number;
}

/** זיכוי תושב יישוב מוטב / אזור פיתוח (ס' 11). שיעור מההכנסה עד תקרה. */
export interface YishuvMutavInput {
  /** שיעור הזיכוי (0..1) — תלוי יישוב. */
  readonly rate: number;
  /** תקרת ההכנסה השנתית המזכה בש"ח — תלוי יישוב. */
  readonly ceilingIls: number;
}

export interface RefundInput {
  readonly taxYear: number;
  readonly employers: readonly EmployerIncome[];
  /** סך נקודות הזיכוי של היחיד (לא סכום בין מעסיקים). */
  readonly creditPoints: number;
  readonly credits?: SalaryCreditsInput;
  readonly investment?: InvestmentTaxInput;
  /** תוצאת מנוע העצמאים (computeSelfEmployed). */
  readonly selfEmployed?: SelfEmployedResult;
  /** נתוני דירה מושכרת. */
  readonly rental?: RentalRefundInput;
  /** הכנסה חייבת נוספת (קצבה/פנסיה/דמי אבטלה/לידה) + המס שנוכה ממנה. */
  readonly otherIncome?: OtherIncomeInput;
  /** זיכוי תושב יישוב מוטב. */
  readonly yishuvMutav?: YishuvMutavInput;
  /** זיכויים נוספים בש"ח שהמשתמש מזין (בן/בת זוג ללא הכנסה, משמרות, נכות, מזונות וכו'). */
  readonly additionalCreditsIls?: number;
}

export interface RefundResult {
  readonly taxYear: number;
  readonly totalSalaryIncomeIls: number;
  readonly salaryGrossTaxIls: number;
  readonly creditPointsValueIls: number;
  readonly otherCreditsIls: number;
  readonly salaryTaxLiabilityIls: number;
  readonly salaryTaxWithheldIls: number;
  readonly investmentTaxLiabilityIls: number;
  readonly investmentTaxWithheldIls: number;
  /** הכנסה עסקית חייבת (עצמאי) שנכללה במדרגות. */
  readonly businessTaxableIncomeIls: number;
  /** מקדמות מס ששולמו (עצמאי). */
  readonly businessAdvancesPaidIls: number;
  /** הכנסה חייבת נוספת (קצבה/פנסיה/אבטלה) שנכללה במדרגות. */
  readonly otherTaxableIncomeIls: number;
  readonly otherIncomeWithheldIls: number;
  /** זיכוי תושב יישוב מוטב שהוחל. */
  readonly yishuvMutavCreditIls: number;
  /** השוואת מסלולי השכירות (אם הוזנה דירה). */
  readonly rentalComparison?: RentalComparison;
  /** המסלול שלפיו חושבה החבות. */
  readonly rentalChosenTrack?: RentalTrackId;
  readonly rentalTaxLiabilityIls: number;
  readonly rentalTaxPaidIls: number;
  /** מס יסף (3% מעל הסף). */
  readonly surtaxIls: number;
  readonly totalLiabilityIls: number;
  readonly totalWithheldIls: number;
  /** חיובי = החזר מגיע; שלילי = חבות נוספת. */
  readonly refundIls: number;
  readonly isRefund: boolean;
  /** פירוט לפי מקור הכנסה — למסך התוצאות ולסיכום המודפס. */
  readonly sources: readonly RefundSourceLine[];
  /** מה חסר ומה זה היה משנה (שקיפות קלט חלקי). */
  readonly missing: readonly string[];
  readonly notes: readonly string[];
  readonly warnings: readonly string[];
}

/** נירמול תוצאת טופס 867 לקלט מס השקעה של מנוע ההחזר. */
export function investmentFrom867(r: Form867TaxResult): InvestmentTaxInput {
  return {
    capitalGainsTaxDueIls: r.capitalGainsTaxDueIls,
    capitalGainsTaxWithheldIls: r.capitalGainsTaxWithheldIls,
    dividendTaxDueIls: r.dividendTaxIls,
    dividendTaxWithheldIls: 0, // מס זר על דיבידנד לא חולץ מטופס 867 ב-MVP
    taxableIncomeIls: r.netTaxableGainIls + r.dividendGrossIls,
  };
}

/** נירמול תוצאת ברוקר זר (Flex) לקלט מס השקעה. זיכוי המס הזר כבר הוחל ב-dividendNetTax. */
export function investmentFromFlex(r: AnnualTaxResult): InvestmentTaxInput {
  return {
    capitalGainsTaxDueIls: r.capitalGainsTaxIls,
    capitalGainsTaxWithheldIls: 0,
    dividendTaxDueIls: r.dividendNetTaxIls,
    dividendTaxWithheldIls: 0,
    taxableIncomeIls: Math.max(0, r.capitalGains.netGainIls) + r.dividends.grossDividendIls,
  };
}

export function computeRefund(input: RefundInput): RefundResult {
  const config = getTaxYearConfig(input.taxYear);
  const credits = input.credits ?? {};
  const missing: string[] = [];
  const notes: string[] = [];
  const warnings: string[] = [];

  const totalSalaryIncomeIls = input.employers.reduce((s, e) => s + e.taxableIncomeIls, 0);
  const salaryTaxWithheldIls = input.employers.reduce((s, e) => s + e.taxWithheldIls, 0);

  // הכנסה ממודרגת: משכורת + רווח עסקי חייב + הכנסה חייבת נוספת — מדרגות פעם אחת על הסך.
  const se = input.selfEmployed;
  const businessTaxableIncomeIls = se?.taxableBusinessIncomeIls ?? 0;
  const otherTaxableIncomeIls = input.otherIncome?.taxableIls ?? 0;
  const otherIncomeWithheldIls = input.otherIncome?.withheldIls ?? 0;
  const bracketedIncomeIls = totalSalaryIncomeIls + businessTaxableIncomeIls + otherTaxableIncomeIls;
  const salaryGrossTaxIls = incomeTaxOnBrackets(bracketedIncomeIls, config.marginalBrackets);
  const creditPointsValueIls = creditPointsValue(input.creditPoints, config.creditPointMonthlyValue);

  // זיכויים נוספים (תרומות/ביטוח חיים/קצבה) + זיכוי פנסיית עצמאי + יישוב מוטב + זיכויים ידניים.
  const sc = config.salaryCredits;
  const donations = credits.donationsIls ?? 0;
  const donationCredit = donations >= sc.donationMinThreshold ? donations * sc.donationCreditRate : 0;
  const lifeCredit = (credits.lifeInsuranceIls ?? 0) * sc.lifeInsuranceCreditRate;
  const pensionCredit = (credits.pensionEmployeeIls ?? 0) * sc.pensionCreditRate;
  const selfEmployedPensionCredit = se?.pensionCreditIls ?? 0;
  // זיכוי יישוב מוטב: שיעור מההכנסה החייבת מיגיעה אישית, עד תקרת היישוב.
  const yishuvMutavCreditIls = input.yishuvMutav
    ? Math.min(bracketedIncomeIls, input.yishuvMutav.ceilingIls) * input.yishuvMutav.rate
    : 0;
  const additionalCreditsIls = Math.max(0, input.additionalCreditsIls ?? 0);
  const otherCreditsIls =
    donationCredit +
    lifeCredit +
    pensionCredit +
    selfEmployedPensionCredit +
    yishuvMutavCreditIls +
    additionalCreditsIls;

  // הזיכויים אינם מחזירים מעבר לחבות (לא ניתנים להחזר) → חבות לא יורדת מתחת ל-0.
  const salaryTaxLiabilityIls = Math.max(0, salaryGrossTaxIls - creditPointsValueIls - otherCreditsIls);

  const inv = input.investment;
  const investmentTaxLiabilityIls = inv ? inv.capitalGainsTaxDueIls + inv.dividendTaxDueIls : 0;
  const investmentTaxWithheldIls = inv ? inv.capitalGainsTaxWithheldIls + inv.dividendTaxWithheldIls : 0;

  // שכירות: השוואת מסלולים עם context של המדרגות — תוספת מעל ההכנסה הממודרגת.
  let rentalComparison: RentalComparison | undefined;
  let rentalChosenTrack: RentalTrackId | undefined;
  let rentalTaxLiabilityIls = 0;
  let rentalTaxableForSurtax = 0;
  const rentalTaxPaidIls = input.rental?.taxAlreadyPaidIls ?? 0;
  if (input.rental) {
    rentalComparison = compareRentalTracks(input.rental, {
      taxOnAdditionalIncome: (amount) =>
        incomeTaxOnBrackets(bracketedIncomeIls + amount, config.marginalBrackets) - salaryGrossTaxIls,
    });
    const wanted = input.rental.chosenTrack ?? rentalComparison.recommendedTrack;
    const chosen =
      rentalComparison.tracks.find((t) => t.track === wanted && t.available) ??
      rentalComparison.tracks.find((t) => t.track === rentalComparison!.recommendedTrack)!;
    rentalChosenTrack = chosen.track;
    rentalTaxLiabilityIls = chosen.taxIls;
    rentalTaxableForSurtax = chosen.taxableIncomeIls;
    warnings.push(...rentalComparison.warnings);
    if (input.rental.chosenTrack && input.rental.chosenTrack !== rentalComparison.recommendedTrack) {
      const rec = rentalComparison.tracks.find((t) => t.track === rentalComparison!.recommendedTrack)!;
      notes.push(`שימו לב: לפי הנתונים, "${rec.label}" היה מוזיל את המס על השכירות.`);
    }
  }

  // מס יסף: 3% על ההכנסה החייבת הכוללת מעל הסף (כולל רווחי הון ושכ"ד חייב).
  const surtaxBaseIls =
    bracketedIncomeIls + rentalTaxableForSurtax + (inv?.taxableIncomeIls ?? 0);
  const surtaxIls = Math.max(0, surtaxBaseIls - config.surtax.thresholdIls) * config.surtax.rate;
  if (surtaxIls > 0) {
    notes.push(
      `הכנסתך החייבת הכוללת עוברת את סף מס היסף (${config.surtax.thresholdIls.toLocaleString()} ₪) — ` +
        `נוסף מס יסף של ${config.surtax.rate * 100}% על החלק שמעל.`,
    );
  }

  const businessAdvancesPaidIls = se?.advancesPaidIls ?? 0;

  const totalLiabilityIls = salaryTaxLiabilityIls + investmentTaxLiabilityIls + rentalTaxLiabilityIls + surtaxIls;
  const totalWithheldIls =
    salaryTaxWithheldIls +
    investmentTaxWithheldIls +
    businessAdvancesPaidIls +
    rentalTaxPaidIls +
    otherIncomeWithheldIls;
  const refundIls = totalWithheldIls - totalLiabilityIls;

  // פירוט לפי מקור. חבות המדרגות מתחלקת בין משכורת/עסק/הכנסה נוספת יחסית להכנסה (פישוט תצוגתי).
  const sources: RefundSourceLine[] = [];
  const share = (part: number): number => (bracketedIncomeIls > 0 ? part / bracketedIncomeIls : 0);
  if (input.employers.length > 0) {
    sources.push({
      id: "salary",
      label: "משכורת",
      taxableIncomeIls: totalSalaryIncomeIls,
      taxIls: salaryTaxLiabilityIls * share(totalSalaryIncomeIls),
      withheldIls: salaryTaxWithheldIls,
    });
  }
  if (se) {
    sources.push({
      id: "business",
      label: "עסק (עצמאי)",
      taxableIncomeIls: businessTaxableIncomeIls,
      taxIls: salaryTaxLiabilityIls * share(businessTaxableIncomeIls),
      withheldIls: businessAdvancesPaidIls,
    });
  }
  if (otherTaxableIncomeIls > 0 || otherIncomeWithheldIls > 0) {
    sources.push({
      id: "other",
      label: "הכנסה נוספת (קצבה/אבטלה)",
      taxableIncomeIls: otherTaxableIncomeIls,
      taxIls: salaryTaxLiabilityIls * share(otherTaxableIncomeIls),
      withheldIls: otherIncomeWithheldIls,
    });
  }
  if (inv) {
    sources.push({
      id: "investment",
      label: "שוק ההון",
      ...(inv.taxableIncomeIls !== undefined ? { taxableIncomeIls: inv.taxableIncomeIls } : {}),
      taxIls: investmentTaxLiabilityIls,
      withheldIls: investmentTaxWithheldIls,
    });
  }
  if (input.rental) {
    sources.push({
      id: "rental",
      label: "דירה מושכרת",
      taxableIncomeIls: rentalTaxableForSurtax,
      taxIls: rentalTaxLiabilityIls,
      withheldIls: rentalTaxPaidIls,
    });
  }
  if (surtaxIls > 0) {
    sources.push({ id: "surtax", label: "מס יסף", taxIls: surtaxIls, withheldIls: 0 });
  }

  // שקיפות קלט חלקי.
  if (input.employers.length === 0 && !se) {
    missing.push("לא הוזנה הכנסה ממשכורת (טופס 106) או מעסק. הזנתן עשויה לשנות מהותית את התוצאה.");
  }
  if (input.employers.length > 1) {
    notes.push(`חושב על סך ההכנסה מ-${input.employers.length} מעסיקים — מקור נפוץ להחזר עקב ניכוי-יתר בין מעסיקים.`);
  }
  if (input.creditPoints === 0) {
    missing.push("לא הוזנו נקודות זיכוי. לכל תושב מגיעות לפחות ~2.25 נקודות — הזנתן תגדיל את ההחזר.");
  }
  if (!credits.pensionEmployeeIls && !credits.lifeInsuranceIls && !credits.donationsIls) {
    missing.push("לא הוזנו זיכויים (פנסיה/ביטוח חיים/תרומות) — אם קיימים, הם עשויים להגדיל את ההחזר.");
  }
  if (!inv) {
    missing.push("לא צורף דוח השקעות (867/ברוקר זר) — אם היו רווחי הון/דיבידנד, הם משפיעים על החבות.");
  }
  if (se) {
    warnings.push(...se.warnings);
    notes.push(...se.notes);
  }
  notes.push("אומדן זה אינו כולל קיזוז הפסדים בין-שנתי ודקויות תקרות הזיכוי. טעון אימות רו\"ח.");

  return {
    taxYear: input.taxYear,
    totalSalaryIncomeIls,
    salaryGrossTaxIls,
    creditPointsValueIls,
    otherCreditsIls,
    salaryTaxLiabilityIls,
    salaryTaxWithheldIls,
    investmentTaxLiabilityIls,
    investmentTaxWithheldIls,
    businessTaxableIncomeIls,
    businessAdvancesPaidIls,
    ...(rentalComparison ? { rentalComparison } : {}),
    ...(rentalChosenTrack ? { rentalChosenTrack } : {}),
    rentalTaxLiabilityIls,
    rentalTaxPaidIls,
    surtaxIls,
    totalLiabilityIls,
    totalWithheldIls,
    refundIls,
    isRefund: refundIls >= 0,
    sources,
    missing,
    notes,
    warnings,
  };
}
