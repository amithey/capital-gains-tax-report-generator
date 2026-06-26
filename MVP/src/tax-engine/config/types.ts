/**
 * ⚠️ כללי המס כאן הם הנחת עבודה ראשונית וטעונים אימות רו"ח לפני שימוש בפרודקשן. ⚠️
 *
 * כל הפרמטרים המספריים מרוכזים כאן (ולא "קסם" בתוך הלוגיקה). פרמטר תלוי-שנה
 * (מדרגות מס, ערך נקודת זיכוי, שיעורי רווח הון) יושב בקובץ נפרד לכל שנת מס,
 * כי הערכים משתנים שנתית ואנו תומכים עד 6 שנים אחורה.
 */

/** מדרגת מס שולי על הכנסה מיגיעה אישית (משכורת). הסכומים שנתיים בש"ח. */
export interface TaxBracket {
  /** גבול עליון של המדרגה בש"ח לשנה. null = מדרגה עליונה (ללא תקרה). */
  readonly upTo: number | null;
  /** שיעור המס השולי במדרגה (0..1). */
  readonly rate: number;
}

export interface CapitalGainsConfig {
  /** שיעור מס רווח הון ליחיד (ברירת מחדל). */
  readonly individualRate: number;
  /** שיעור ליחיד "בעל מניות מהותי" (מחזיק ≥10%) — סעיף 91(ב) לפקודה. */
  readonly substantialShareholderRate: number;
  /** הנמקה + מקור. */
  readonly note: string;
}

/**
 * זיכויים נפוצים על משכורת. כל השיעורים 0..1.
 * ⚠️ שיעורי הזיכוי יציבים יחסית בחוק, אך התקרות תלויות-שנה וטעונות אימות. ⚠️
 */
export interface SalaryCreditsConfig {
  /** זיכוי בגין תרומות למוסד מוכר (סעיף 46) — שיעור הזיכוי. */
  readonly donationCreditRate: number;
  /** סף מינימום לתרומות שמזכות בזיכוי (תרומה שנתית מצטברת מעל סף זה). */
  readonly donationMinThreshold: number;
  /** זיכוי בגין פרמיות ביטוח חיים (סעיף 45א) — שיעור הזיכוי. */
  readonly lifeInsuranceCreditRate: number;
  /** זיכוי בגין הפקדות עובד לקצבה (סעיף 45א) — שיעור הזיכוי. */
  readonly pensionCreditRate: number;
  readonly note: string;
}

/**
 * ערכי נקודות זיכוי לפי מצב אישי. ⚠️ אומדן — כללי נק"ז מורכבים, תלויי-שנה
 * ומגדר, וטעונים אימות. הערכים כאן מכסים מקרים נפוצים בלבד. ⚠️
 */
export interface CreditPointsConfig {
  /** נקודות בסיס לכל תושב ישראל. */
  readonly resident: number;
  /** תוספת לאישה. */
  readonly womanExtra: number;
  /** תוספת להורה במשפחה חד-הורית (אומדן). */
  readonly singleParent: number;
  /** נקודות לילד לפי שכבת גיל (לכל הורה, פישוט). */
  readonly childBirthYear: number;
  readonly child1to5: number;
  readonly child6to17: number;
  readonly child18: number;
  /** אומדן תוספת לעולה חדש (בתקופת הזכאות) — מפושט. */
  readonly newImmigrantEstimate: number;
  /** אומדן תוספת לחייל/שירות לאומי משוחרר (בתקופת הזכאות) — מפושט. */
  readonly dischargedSoldierEstimate: number;
  /** תוספת בגין סיום תואר אקדמי (אומדן, שנה אחת). */
  readonly academicDegreeEstimate: number;
  readonly note: string;
}

/**
 * פרמטרים לעצמאים — ניכויים וזיכויים על הפקדות פנסיוניות (ס' 47, 45א),
 * קרן השתלמות, וניכוי דמי ביטוח לאומי.
 * ⚠️ התקרות תלויות-שנה וטעונות אימות רו"ח. ⚠️
 */
export interface SelfEmployedConfig {
  /** ניכוי בגין הפקדה לקצבה (ס' 47) — שיעור מההכנסה המזכה. */
  readonly pensionDeductionRate: number;
  /** זיכוי בגין הפקדה לקצבה (ס' 45א) — שיעור הזיכוי מההפקדה המזכה. */
  readonly pensionCreditRate: number;
  /** חלק ההפקדה שמזכה בזיכוי (שיעור מההכנסה המזכה). */
  readonly pensionCreditDepositRate: number;
  /** תקרת הכנסה מזכה שנתית לעצמאי (לפנסיה). */
  readonly pensionQualifyingIncomeCeilingIls: number;
  /** ניכוי בגין קרן השתלמות לעצמאי — שיעור מההכנסה הקובעת. */
  readonly studyFundDeductionRate: number;
  /** תקרת הכנסה קובעת שנתית לקרן השתלמות לעצמאי. */
  readonly studyFundIncomeCeilingIls: number;
  /** חלק דמי הביטוח הלאומי (ללא בריאות) שמוכר כניכוי (ס' 47א). */
  readonly nationalInsuranceDeductibleShare: number;
  readonly note: string;
}

/**
 * פרמטרים לדירת מגורים מושכרת — שלושת מסלולי המיסוי.
 * ⚠️ תקרת הפטור מתעדכנת שנתית — טעון אימות רו"ח. ⚠️
 */
export interface RentalConfig {
  /** תקרת הפטור החודשית להשכרת דירת מגורים (חוק הפטור). */
  readonly monthlyExemptionCapIls: number;
  /** שיעור המס במסלול המופחת (ס' 122). */
  readonly flatTrackRate: number;
  /** שיעור פחת שנתי ברירת מחדל על שווי המבנה (ללא קרקע). */
  readonly depreciationRateDefault: number;
  /** שיעור מס שולי מינימלי על הכנסה פסיבית למי שטרם מלאו לו 60 (ס' 121). */
  readonly passiveIncomeMinMarginalRate: number;
  readonly note: string;
}

/** מס יסף (ס' 121ב) — מס נוסף על הכנסה חייבת כוללת מעל סף. */
export interface SurtaxConfig {
  /** סף ההכנסה החייבת השנתית שמעליו חל מס יסף. */
  readonly thresholdIls: number;
  /** שיעור מס היסף על החלק שמעל הסף. */
  readonly rate: number;
  readonly note: string;
}

export interface TaxYearConfig {
  readonly year: number;
  readonly capitalGains: CapitalGainsConfig;
  readonly creditPoints: CreditPointsConfig;
  /** ערך נקודת זיכוי חודשי בש"ח. ערך שנתי = ×12. */
  readonly creditPointMonthlyValue: number;
  /** מדרגות מס שולי שנתיות. */
  readonly marginalBrackets: readonly TaxBracket[];
  /** זיכויים על משכורת. */
  readonly salaryCredits: SalaryCreditsConfig;
  /** פרמטרים לעצמאים. */
  readonly selfEmployed: SelfEmployedConfig;
  /** פרמטרים לדירה מושכרת. */
  readonly rental: RentalConfig;
  /** מס יסף. */
  readonly surtax: SurtaxConfig;
  /** מקור רשמי לערכי השנה. */
  readonly source: string;
}
