import type { RentalTrackId } from "@/tax-engine";
import { EMPTY_FILING_PROFILE, filingQuestions, type FilingProfile } from "./filing-profile";
import { annualSource, OFFICIAL_SOURCES, RESEARCH_DATE } from "./official-sources";

/** מפת הכנה מותנית בלבד. מקורות לצד כל פריט; אינה קובעת חובת הגשה. */
export interface FormsGuideInput {
  readonly taxYear: number;
  readonly hasEmployment: boolean;
  readonly employerCount: number;
  readonly hasSelfEmployment: boolean;
  readonly hasInvestment: boolean;
  readonly investmentSource?: "867" | "flex";
  readonly investmentOriginUnknown?: boolean;
  readonly hasRental: boolean;
  readonly rentalTrack?: RentalTrackId;
  readonly rentalPartialExemption?: boolean;
  readonly filing?: FilingProfile;
}
export interface FormGuideItem {
  readonly formId: string;
  readonly formName: string;
  readonly why: string;
  readonly attachments: readonly string[];
  readonly kind: "main" | "appendix" | "attachment";
  readonly sourceUrl: string;
}
export interface FormsGuide {
  readonly taxYear: number;
  readonly route: "135-candidate" | "1301-candidate" | "review";
  readonly filingExplanation: string;
  readonly items: readonly FormGuideItem[];
  readonly howToFile: readonly string[];
  readonly readinessIssues: readonly string[];
  readonly answers: readonly { label: string; answer: string }[];
  readonly readyToFile: false;
  readonly researchedAt: string;
}

export function buildFormsGuide(input: FormsGuideInput): FormsGuide {
  const annual = annualSource(input.taxYear);
  const profile = input.filing ?? EMPTY_FILING_PROFILE;
  const foreign = (input.hasInvestment && input.investmentSource === "flex") || profile.foreignIncome === "yes";
  const uncertain = filingQuestions(input.hasSelfEmployment, input.hasRental)
    .some((q) => q.section !== "documents" && profile[q.key] === "unknown");
  const needsReview = uncertain || profile.resident !== "yes" || profile.specialCase !== "no" ||
    profile.propertySale !== "no" || profile.retirement !== "no" ||
    (input.hasSelfEmployment && profile.microBusiness !== "no") ||
    (input.hasRental && (profile.rentsOwnHome !== "no" || !input.rentalTrack)) ||
    Boolean(input.investmentOriginUnknown);
  const route = needsReview ? "review" :
    foreign || input.hasSelfEmployment || profile.filingDuty === "yes" ? "1301-candidate" : "135-candidate";
  const filingExplanation = route === "review"
    ? "יש פרטים שדורשים בדיקה לפני בחירת טופס ראשי. אין כאן קביעה של חובת הגשה או פטור ממנה."
    : route === "1301-candidate"
      ? "1301 הוא מסלול לבדיקה לפי הנתונים שנמסרו. יש לאמת חובת הגשה, חריגים והנספחים לשנת המס."
      : "135 הוא מסלול אפשרי רק למי שאינו חייב בדוח שנתי ועומד בתנאי הטופס. השאלון אינו מאשר פטור מחובת דיווח.";
  const items: FormGuideItem[] = [];
  function add(formId: string, formName: string, why: string, attachments: string[], kind: FormGuideItem["kind"], sourceUrl: string = annual.url) {
    items.push({ formId, formName, why, attachments, kind, sourceUrl });
  }
  if (route !== "review") add(route === "135-candidate" ? "135" : "1301", "טופס ראשי לשנת המס שנבחרה", filingExplanation, [], "main", annual.url);
  else add("בדיקת מסלול", "בחירת טופס ראשי", "יש לבדוק התאמה ל-135, ל-1301 או למסלול נפרד. הקישור כולל את טופסי השנה; הם אינם ממולאים אוטומטית כאן.", [], "main");
  if (input.hasEmployment) add("106", `אישורי שכר מכל המעסיקים (${input.employerCount})`, "מחברים את הכנסות השנה ואת המס שנוכה בפועל. ריבוי מעסיקים אינו מבטיח החזר.", ["טופס 106 שנתי מכל מעסיק", "אישורי תיאום מס, אם קיימים"], "attachment", OFFICIAL_SOURCES.refund.url);
  if (profile.spouse !== "no") add("בן/בת זוג", "הכנסות ונתוני בן או בת הזוג", "אם נשואים, יש לברר את אופן הדיווח ולרכז את נתוני שני בני הזוג; אין להניח שהכנסה שלא הוזנה היא אפס.", ["אישורי הכנסה ומס של בן/בת הזוג, או בירור מצב ללא הכנסה ודיווח נפרד"], "attachment", OFFICIAL_SOURCES.refund.url);
  if (profile.benefits !== "no") add("קצבאות", "פנסיה וביטוח לאומי, אם התקבלו", "יש לסווג את סוג התשלום והחלק החייב ולמנוע ספירה כפולה עם השכר.", ["106 ממשלמי פנסיה", "אישורים שנתיים מביטוח לאומי על תקבולים וניכוי מס"], "attachment", OFFICIAL_SOURCES.refund.url);
  if (profile.retirement !== "no") add("161 / 116ג", "פרישה ובדיקת פריסה, לפי הצורך", "פיצויים ופריסה אינם מחושבים במוצר בשלב זה; ההחלטות עשויות להשפיע על מספר שנים.", ["טופס 161 ואישורי פקיד השומה", "אישורי הכנסה לשנות הפריסה הרלוונטיות"], "attachment", OFFICIAL_SOURCES.retirement.url);
  if (input.hasSelfEmployment) {
    add("1320", "דוח הכנסות והוצאות עסק, במסלול הרגיל", "נדרש במסלול הדוח השנתי הרגיל. יש לבדוק בנפרד התאמה לדיווח עסק זעיר; עוסק פטור במע״מ אינו אישור למסלול זה.", ["סיכום הכנסות והוצאות ואסמכתאות", "אישורי מקדמות וניכוי מס במקור מלקוחות", "אישורי הפקדות לפנסיה, השתלמות וביטוח לאומי", "בדיקת 6111 ונספחי פחת 1342/1343 לפי התנאים"], "appendix");
    if (profile.microBusiness !== "no") add("עסק זעיר", "בדיקת זכאות לדיווח מקוצר", "מסלול נפרד בכפוף להכרה, תיאום מס ותנאי הזכאות. הוא אינו ממומש בחישוב הנוכחי.", ["אישור מעמד ותיאום מס", "נתוני מחזור וניכויים לשנה"], "attachment", OFFICIAL_SOURCES.micro.url);
  }
  if (input.hasInvestment) {
    add("1322", "רווחים והפסדים מניירות ערך סחירים", "מרכזים את כל חשבונות המסחר של השנה, עם חלק הבעלות והמס שנוכה. יש להפריד בין רווח הון, ריבית ודיבידנד.", ["867 מכל בנק וברוקר ישראלי", "דוחות ברוקר זר, אם קיימים", "היסטוריית רכישות ויתרות פתיחה במידת הצורך"], "appendix");
    if (input.investmentSource === "flex") add("1325", "פירוט מכירות לצורך נספח 1322", "נדרש פירוט כאשר לא נוכה מלוא המס ובמקרים נוספים המפורטים בהוראות. אין להסתפק בסכום נטו מהברוקר.", ["פירוט עסקאות, עמלות, עלויות ושערי המרה", "בדיקת אירועי חברה והעברות תיק"], "appendix");
  }
  if (foreign || input.investmentOriginUnknown) add("1324", "הכנסות חוץ ומס זר, אם רלוונטי", "מקור ההכנסה אינו נקבע רק לפי מקום הברוקר. זיכוי מס זר כפוף לכללים ותקרות; אינו החזר אוטומטי של כל מס שנוכה.", ["הכנסה ומס לפי מדינה וסוג הכנסה", "אישורי ניכוי ותשלום מס זר"], "appendix");
  if (profile.carriedLosses !== "no") add("1344", "הפסדים מועברים, אם קיימים", "יש לאמת יתרות משנים קודמות ואת סוג ההפסד לפני קיזוז; המנוע עדיין אינו מיישם יתרות אלה.", ["דוחות קודמים ונספחי הפסדים", "שומות ויתרות הפסד מאומתות"], "appendix");
  if (input.hasRental) {
    if (input.rentalTrack === "flat10") add("סעיף 122", "דיווח ותשלום שכירות במסלול 10%, בכפוף לתנאים", "קיים גם שירות דיווח נפרד; בחירת מסלול 10% לבדה אינה קביעה שחייבים ב-1301. מועד התשלום הרגיל הוא 31 בינואר בשנה העוקבת; יש לבדוק הוראות עדכניות.", ["חוזים ותקבולים מכל הדירות", "אסמכתאות לתשלום מס", "בדיקת שוכר-משכיר כשמשלמים גם על מגורים"], "attachment", OFFICIAL_SOURCES.rental.url);
    else add("1321", "בדיקת דיווח הכנסה מנכס", input.rentalTrack === "exempt" && !input.rentalPartialExemption
      ? "יש לאמת שהפטור מלא על כלל ההכנסות הרלוונטיות. אם הפטור חלקי, נדרש לחשב ולדווח גם את החלק החייב; בחירת פטור אינה אישור לפטור מלא."
      : "במסלול הרגיל או בפטור חלקי נדרש פירוט החלק החייב וההוצאות המותרות. דירות בחו״ל והשכרה עסקית דורשות בדיקה אחרת.", ["חוזי שכירות ותקבולים", "הוצאות ואישורי ריבית, אם נדרשים במסלול", "בסיס פחת ובדיקת נספחי פחת, אם נדרש"], "appendix");
  }
  if (profile.propertySale !== "no") add("מקרקעין", "בדיקה נפרדת של עסקה ומס שבח", "מכירת נכס אינה שכירות. יש לבדוק הצהרת עסקה, שומה, פריסה ותיקון שומה בנפרד; אין במוצר חישוב מס שבח.", ["חוזי רכישה ומכירה", "שומת מס שבח, תשלומים והוצאות", "בירור צורך בפריסה ובדוחות לשנות הפריסה"], "attachment", OFFICIAL_SOURCES.property.url);
  add("זיכויים וניכויים", "אסמכתאות להטבות שנדרשו", "מצרפים רק מסמכים הרלוונטיים להטבה ולשנת המס. אין להניח שכל הפקדה או תרומה מזכה ללא תקרה ותנאים.", ["אישורים שנתיים לקופות וביטוח חיים", "קבלות תרומות מזכות", "לפי המקרה: 119 לימודים, 1312א יישוב מזכה, 116א קרוב עם מוגבלות, תעודת שחרור או עלייה"], "attachment", OFFICIAL_SOURCES.refund.url);
  add("חשבון בנק", "אישור חשבון לקבלת החזר", "את פרטי הזיהוי וחשבון הבנק משלימים בהגשה הרשמית, לא באתר זה.", ["אישור ניהול חשבון או צילום צ׳ק"], "attachment", OFFICIAL_SOURCES.refund.url);
  const readinessIssues = ["הפלט הוא תיק הכנה בלבד: עדיין אין מילוי טפסים רשמיים, אימות מקצועי מלא או הגשה לרשות המסים."];
  if (route === "review") readinessIssues.push("טרם הוכרע מסלול הדיווח.");
  if (profile.allDocuments !== "yes") readinessIssues.push("טרם אושר שנאספו כל אישורי ההכנסות והמס.");
  if (profile.bankEvidence !== "yes") readinessIssues.push("טרם אושר שקיים אישור חשבון בנק להחזר.");
  return {
    taxYear: input.taxYear, route, filingExplanation, items, readinessIssues, readyToFile: false, researchedAt: RESEARCH_DATE,
    answers: filingQuestions(input.hasSelfEmployment, input.hasRental).map((q) => ({ label: q.label, answer: profile[q.key] === "yes" ? "כן" : profile[q.key] === "no" ? "לא" : "לא בטוח / טרם נבדק" })),
    howToFile: [
      "יש לאמת את החישוב ואת התאמת מסלול ההגשה לפני שליחה. התוצאה יכולה להיות גם חוב, לא רק החזר.",
      "משלימים טופס רשמי או דיווח מקוון לשנת המס הרלוונטית ומצרפים אסמכתאות בהתאם למסלול.",
      "בדיווח מקוון מלא יש לסיים את פעולת השליחה ולשמור אישור הגשה. הורדת הסיכום מכאן אינה הגשה.",
      "ההחזר הסופי, אם יאושר, נקבע בידי רשות המסים לאחר בדיקת הדוח והשומה; האומדן אינו התחייבות לתשלום.",
    ],
  };
}
