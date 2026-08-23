import type { TaxYearConfig } from "./types";

/**
 * פרמטרי מס לשנת 2025.
 * ⚠️ ערכים אלה הם הנחת עבודה וטעונים אימות רו"ח. ⚠️
 *
 * שיעורי רווח הון (25%/30%) יציבים בחוק (סעיף 91). מדרגות המס וערך נקודת הזיכוי
 * ל-2025 כאן הם **ארעיים** ויש לאמתם מול פרסומי רשות המסים לשנת 2025 לפני שימוש
 * במודול המשכורת. מסלול טופס 867 משתמש רק בשיעור רווח ההון.
 */
export const TAX_YEAR_2025: TaxYearConfig = {
  year: 2025,
  capitalGains: {
    individualRate: 0.25,
    substantialShareholderRate: 0.3,
    note:
      "סעיף 91(ב) לפקודת מס הכנסה: 25% ליחיד; 30% ל'בעל מניות מהותי' (≥10%). " +
      "אינו כולל מס יסף (3%) ברמת ההכנסה החייבת השנתית.",
  },
  // ארעי — לאימות מול פרסומי 2025.
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
    note: "אומדן נק\"ז כבדין הנוכחי (תושב 2.25, אישה +0.5, ילדים לפי גיל). תלוי-שנה — טעון אימות.",
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
    note: "שיעורי זיכוי כבדין הנוכחי (תרומות 35%, ביטוח חיים 25%, קצבה 35%). תקרות 2025 ארעיות — טעון אימות.",
  },
  // ארעי — תקרות 2025 טרם אומתו מול פרסומי רשות המסים/ביטוח לאומי.
  selfEmployed: {
    pensionDeductionRate: 0.11,
    pensionCreditRate: 0.35,
    pensionCreditDepositRate: 0.055,
    pensionQualifyingIncomeCeilingIls: 232800,
    studyFundDeductionRate: 0.045,
    studyFundIncomeCeilingIls: 293397,
    nationalInsuranceDeductibleShare: 0.52,
    note:
      "שיעורי הניכוי/הזיכוי כבדין הנוכחי (11% / 35% / 4.5% / 52%). התקרות הן ערכי 2024 כארעיים — " +
      "טעון אימות מול פרסומי 2025.",
  },
  rental: {
    monthlyExemptionCapIls: 5654,
    flatTrackRate: 0.1,
    depreciationRateDefault: 0.02,
    passiveIncomeMinMarginalRate: 0.31,
    note:
      "תקרת הפטור החודשית כערך 2024 כארעי — מתעדכנת שנתית, טעון אימות מול פרסומי 2025. " +
      "מסלול 10% (ס'122) ורצפת 31% להכנסה פסיבית (מתחת לגיל 60) כבדין הנוכחי.",
  },
  surtax: {
    thresholdIls: 721560,
    rate: 0.03,
    note: "מס יסף 3% — סף 2025 כערך 2024 כארעי, טעון אימות.",
  },
  source: "שיעורי רווח הון: פקודת מס הכנסה ס'91. מדרגות/נק' זיכוי 2025: ארעי — טעון אימות.",
};
