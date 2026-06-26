import type { TaxYearConfig } from "./types";

/**
 * פרמטרי מס לשנת 2024.
 * ⚠️ ערכים אלה הם הנחת עבודה וטעונים אימות רו"ח. ⚠️
 *
 * מקורות: רשות המסים — מדרגות מס הכנסה ליחיד 2024; ערך נקודת זיכוי 2024 (242 ₪/חודש);
 * פקודת מס הכנסה סעיף 91 (שיעורי רווח הון).
 */
export const TAX_YEAR_2024: TaxYearConfig = {
  year: 2024,
  capitalGains: {
    individualRate: 0.25,
    substantialShareholderRate: 0.3,
    note:
      "סעיף 91(ב) לפקודת מס הכנסה: 25% ליחיד; 30% ל'בעל מניות מהותי' (מחזיק ≥10%). " +
      "אינו כולל מס יסף (3%) שמחושב ברמת ההכנסה החייבת השנתית הכוללת — יטופל ב-annual-return.",
  },
  creditPointMonthlyValue: 242,
  creditPoints: {
    resident: 2.25,
    womanExtra: 0.5,
    singleParent: 1,
    childBirthYear: 1.5,
    child1to5: 2.5,
    child6to17: 1,
    child18: 1,
    newImmigrantEstimate: 1,
    dischargedSoldierEstimate: 1,
    academicDegreeEstimate: 1,
    note:
      "אומדן נק\"ז: תושב 2.25, אישה +0.5, הורה יחיד +1, ילדים לפי גיל (שנת לידה 1.5; 1-5: 2.5; 6-17: 1; גיל 18: 1) לכל הורה. " +
      "עולה/חייל משוחרר/תואר — אומדן מפושט. הכללים המלאים מורכבים ותלויי-שנה — טעון אימות רו\"ח.",
  },
  marginalBrackets: [
    { upTo: 84120, rate: 0.1 },
    { upTo: 120720, rate: 0.14 },
    { upTo: 193800, rate: 0.2 },
    { upTo: 269280, rate: 0.31 },
    { upTo: 560280, rate: 0.35 },
    { upTo: 721560, rate: 0.47 },
    { upTo: null, rate: 0.5 },
  ],
  salaryCredits: {
    donationCreditRate: 0.35,
    donationMinThreshold: 207,
    lifeInsuranceCreditRate: 0.25,
    pensionCreditRate: 0.35,
    note:
      "שיעורי זיכוי: תרומות 35% (ס'46, מעל סף ~207 ₪ ובכפוף לתקרה), ביטוח חיים 25%, " +
      "הפקדות עובד לקצבה 35% (ס'45א). התקרות מפושטות וטעונות אימות.",
  },
  selfEmployed: {
    pensionDeductionRate: 0.11,
    pensionCreditRate: 0.35,
    pensionCreditDepositRate: 0.055,
    pensionQualifyingIncomeCeilingIls: 232800,
    studyFundDeductionRate: 0.045,
    studyFundIncomeCeilingIls: 293397,
    nationalInsuranceDeductibleShare: 0.52,
    note:
      "ניכוי קצבה לעצמאי עד 11% מההכנסה המזכה (ס'47) וזיכוי 35% על הפקדה של עד 5.5% נוספים (ס'45א); " +
      "תקרת הכנסה מזכה 2024 ~232,800 ₪. קרן השתלמות: ניכוי עד 4.5% מהכנסה קובעת עד ~293,397 ₪. " +
      "52% מדמי ביטוח לאומי (ללא דמי בריאות) מוכרים כניכוי (ס'47א). כל התקרות טעונות אימות רו\"ח.",
  },
  rental: {
    monthlyExemptionCapIls: 5654,
    flatTrackRate: 0.1,
    depreciationRateDefault: 0.02,
    passiveIncomeMinMarginalRate: 0.31,
    note:
      "תקרת פטור חודשית 2024: 5,654 ₪ (חוק מס הכנסה — פטור להשכרת דירת מגורים). מסלול מופחת 10% (ס'122). " +
      "פחת ברירת מחדל 2% משווי המבנה (יש מסלולים של עד 4% — תלוי נסיבות). " +
      "הכנסה פסיבית למי שטרם מלאו לו 60 ממוסה החל ממדרגת 31% (ס'121). טעון אימות רו\"ח.",
  },
  surtax: {
    thresholdIls: 721560,
    rate: 0.03,
    note:
      "מס יסף (ס'121ב): 3% על חלק ההכנסה החייבת הכוללת (כולל רווחי הון ושכ\"ד חייב) שמעל 721,560 ₪ ב-2024. " +
      "טעון אימות רו\"ח.",
  },
  source: "רשות המסים — מדרגות מס הכנסה 2024 + ערך נקודת זיכוי 2024",
};
