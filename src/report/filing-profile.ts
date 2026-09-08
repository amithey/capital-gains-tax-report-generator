export type Answer = "unknown" | "yes" | "no";
export interface FilingProfile {
  resident: Answer;
  spouse: Answer;
  benefits: Answer;
  retirement: Answer;
  foreignIncome: Answer;
  carriedLosses: Answer;
  propertySale: Answer;
  specialCase: Answer;
  filingDuty: Answer;
  microBusiness: Answer;
  rentsOwnHome: Answer;
  allDocuments: Answer;
  bankEvidence: Answer;
}

export const EMPTY_FILING_PROFILE: FilingProfile = {
  resident: "unknown", spouse: "unknown", benefits: "unknown", retirement: "unknown",
  foreignIncome: "unknown", carriedLosses: "unknown", propertySale: "unknown",
  specialCase: "unknown", filingDuty: "unknown", microBusiness: "unknown",
  rentsOwnHome: "unknown", allDocuments: "unknown", bankEvidence: "unknown",
};

export interface FilingQuestion {
  key: keyof FilingProfile;
  label: string;
  hint: string;
  scope: "all" | "business" | "rental";
  section: "income" | "filing" | "documents";
}

export const FILING_QUESTIONS: readonly FilingQuestion[] = [
  { key: "resident", label: "הייתם תושבי ישראל לאורך כל שנת המס?", hint: "מעבר לארץ או לחו״ל עשוי לשנות את החישוב.", scope: "all", section: "income" },
  { key: "spouse", label: "הייתם נשואים בשנת המס?", hint: "ייתכן שצריך לצרף גם את נתוני בן או בת הזוג, לרבות מצב ללא הכנסה או דוח נפרד.", scope: "all", section: "income" },
  { key: "benefits", label: "קיבלתם פנסיה או תשלומים מביטוח לאומי?", hint: "למשל אבטלה, לידה, מילואים או פגיעה בעבודה. לא כל קצבה חייבת במס; צריך לזהות את סוג התשלום ולמנוע ספירה כפולה דרך המעסיק.", scope: "all", section: "income" },
  { key: "retirement", label: "קיבלתם פיצויים או כספים עקב פרישה?", hint: "אוספים טופס 161 ואישורי מס. פריסה או פטור דורשים חישוב נפרד.", scope: "all", section: "income" },
  { key: "foreignIncome", label: "היו הכנסות מחו״ל שלא מופיעות בדוח ההשקעות שהעליתם?", hint: "למשל שכר, שכירות, ריבית או דיבידנד. מקום הברוקר לבדו אינו קובע את מקור ההכנסה.", scope: "all", section: "income" },
  { key: "carriedLosses", label: "יש הפסדים משנים קודמות שתרצו לקזז?", hint: "צריך את הדוחות והיתרות מהשנים הקודמות. תקופת בקשת החזר אינה מגבלת שש שנים גורפת להעברת הפסדים.", scope: "all", section: "income" },
  { key: "propertySale", label: "מכרתם נכס מקרקעין או מבקשים לבדוק מס שבח?", hint: "זה מסלול שונה מהכנסה חודשית משכירות; נדרשים מסמכי העסקה והשומה.", scope: "all", section: "income" },
  { key: "specialCase", label: "היה מקרה נוסף שלא כוסה בשאלות?", hint: "למשל קריפטו, ריבית מפיקדון, אופציות עובדים, מניות פרטיות, שליטה בחברה, נאמנות, קיבוץ, פטור נכות או הטבה מיוחדת שלא הוזנה.", scope: "all", section: "income" },
  { key: "filingDuty", label: "ידוע לכם שאתם חייבים בדוח שנתי או שקיבלתם דרישה להגיש?", hint: "גם שכירים עשויים להיות חייבים בדוח. השאלון אינו קובע פטור מחובת דיווח.", scope: "all", section: "filing" },
  { key: "microBusiness", label: "הוכרתם כבעלי עסק זעיר וביצעתם תיאום מס למסלול הזה?", hint: "זה אינו אותו דבר כמו עוסק פטור במע״מ. ייתכן מסלול מקוצר במקום 1301, בכפוף לתנאים.", scope: "business", section: "filing" },
  { key: "rentsOwnHome", label: "השכרתם דירה ובמקביל שילמתם על מגורים בשכירות או בבית אבות?", hint: "ייתכן שמסלול שוכר-משכיר רלוונטי. הוא עדיין לא כלול בהשוואה שלנו.", scope: "rental", section: "filing" },
  { key: "allDocuments", label: "אספתם את כל אישורי ההכנסות והמס של השנה?", hint: "מכל המעסיקים, החשבונות והמשלמים. זה אישור שלכם בלבד, לא בדיקת מסמכים אוטומטית.", scope: "all", section: "documents" },
  { key: "bankEvidence", label: "יש לכם אישור ניהול חשבון או צילום צ׳ק להחזר?", hint: "אין צורך להזין כאן פרטי בנק. מצרפים את האישור בהגשה לרשות המסים.", scope: "all", section: "documents" },
];

export function filingQuestions(business: boolean, rental: boolean): readonly FilingQuestion[] {
  return FILING_QUESTIONS.filter((q) => q.scope === "all" || (q.scope === "business" && business) || (q.scope === "rental" && rental));
}

/** עוצר אומדן כולל כאשר ידוע שחסרה יכולת חישוב; אינו תחליף לבדיקת חובת דיווח. */
export function filingCoverageIssues(profile: FilingProfile, business: boolean, rental: boolean): string[] {
  const issues: string[] = [];
  for (const q of filingQuestions(business, rental)) {
    if (q.section === "documents" || q.key === "filingDuty") continue;
    const answer = profile[q.key];
    if (answer === "unknown") issues.push(`צריך להשלים: ${q.label}`);
    else if (q.key === "resident" ? answer === "no" : answer === "yes") {
      issues.push(`${q.label} הנתון דורש הרחבת חישוב או בדיקה מקצועית שעדיין אינן כלולות במוצר. לא נציג אומדן כולל שמתעלם ממנו.`);
    }
  }
  return issues;
}
