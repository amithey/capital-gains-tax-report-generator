import type { RentalTrackId } from "@/tax-engine";

/**
 * ⚠️ הנחת עבודה, טעון אימות רו"ח/רשות המסים. ⚠️
 *
 * מדריך הטפסים — פונקציה טהורה שממפה את הפרופילים והבחירות של המשתמש
 * לרשימת הטפסים שיש להגיש למס הכנסה והמסמכים שיש לצרף. האתר לא מגיש כלום —
 * הוא רק אומר *מה* להגיש ולמה.
 *
 * הבחנה חשובה: שכיר "טהור" (משכורת בלבד, אולי עם תיק ישראלי שנוכה בו מס במקור)
 * בדרך כלל אינו חייב בהגשה — הוא *רשאי* להגיש בקשת החזר (135). לעומתו חייבים
 * בדוח שנתי מלא (1301): עצמאי; בעל דירה במסלול 10% או השולי; ומי שיש לו
 * הכנסה מחו"ל (למשל ברוקר זר) — טופס 135 אינו תומך בהכנסות חוץ.
 */

export interface FormsGuideInput {
  readonly taxYear: number;
  readonly hasEmployment: boolean;
  readonly employerCount: number;
  readonly hasSelfEmployment: boolean;
  readonly hasInvestment: boolean;
  /** מקור דוח ההשקעות: 867 (ברוקר ישראלי) או flex (ברוקר זר). */
  readonly investmentSource?: "867" | "flex";
  readonly hasRental: boolean;
  readonly rentalTrack?: RentalTrackId;
}

export interface FormGuideItem {
  /** מספר/שם רשמי של הטופס. */
  readonly formId: string;
  readonly formName: string;
  /** למה צריך אותו — בעברית פשוטה. */
  readonly why: string;
  /** מסמכים לצרף. */
  readonly attachments: readonly string[];
  /** האם זה הדוח הראשי או נספח/צרופה. */
  readonly kind: "main" | "appendix" | "attachment";
}

export interface FormsGuide {
  /** האם קיימת חובת הגשה (להבדיל מזכות לבקש החזר). */
  readonly mustFile: boolean;
  /** הסבר על חובת/זכות ההגשה. */
  readonly filingExplanation: string;
  readonly items: readonly FormGuideItem[];
  /** איך מגישים בפועל. */
  readonly howToFile: readonly string[];
}

export function buildFormsGuide(input: FormsGuideInput): FormsGuide {
  const items: FormGuideItem[] = [];

  // הכנסה מחו"ל (ברוקר זר) — טופס 135 אינו תומך בה, ולכן נדרש 1301.
  const hasForeignIncome = input.hasInvestment && input.investmentSource === "flex";

  // חובת הגשה: עצמאי תמיד; דירה במסלול 10%/שולי; הכנסה מחו"ל; (פטור מלא ושכיר טהור — לא).
  const mustFile =
    input.hasSelfEmployment ||
    (input.hasRental && (input.rentalTrack === "flat10" || input.rentalTrack === "marginal")) ||
    hasForeignIncome;

  // הדוח הראשי.
  if (mustFile) {
    items.push({
      formId: "1301",
      formName: "דוח שנתי ליחיד",
      why: "הדוח המרכזי שמרכז את כל ההכנסות שלך לשנה. במצב שלך (עצמאי/שכירות חייבת) הגשתו היא חובה — וההחזר, אם מגיע, מחושב דרכו.",
      attachments: [],
      kind: "main",
    });
  } else {
    items.push({
      formId: "135",
      formName: "דוח שנתי מקוצר / בקשה להחזר מס ליחיד",
      why: "כשאין חובת הגשה, זו הדרך לבקש את ההחזר: דוח מקוצר שמרכז את ההכנסות והניכויים. אפשר להגיש עד 6 שנים אחורה.",
      attachments: [],
      kind: "main",
    });
  }

  // שכיר — טופסי 106.
  if (input.hasEmployment) {
    items.push({
      formId: "106",
      formName: `טופס 106 — מכל מעסיק${input.employerCount > 1 ? ` (${input.employerCount} מעסיקים)` : ""}`,
      why:
        input.employerCount > 1
          ? "כל מעסיק ניכה מס בנפרד כאילו הוא היחיד — חישוב מחדש על הסך הכולל הוא בדיוק מקור ההחזר. חובה לצרף את כולם."
          : "מסכם את השכר והמס שנוכה — הבסיס לחישוב ההחזר.",
      attachments: ["אישורי הפקדה לקופות גמל/ביטוח חיים (אם נדרשו זיכויים)", "קבלות מקוריות על תרומות (ס' 46)"],
      kind: "attachment",
    });
  }

  // עצמאי.
  if (input.hasSelfEmployment) {
    items.push({
      formId: "1320 (נספח א')",
      formName: "חישוב ההכנסה החייבת מעסק",
      why: "כאן מפורטים המחזור וההוצאות המוכרות של העסק — הנספח שמתרגם את הנהלת החשבונות שלך לשורת הכנסה בדוח.",
      attachments: [
        "אישור שנתי על הפקדות לפנסיה (לניכוי/זיכוי)",
        "אישור שנתי על הפקדות לקרן השתלמות",
        "אישור שנתי מביטוח לאומי על דמי ביטוח ששולמו",
        "אישור על מקדמות מס ששולמו",
      ],
      kind: "appendix",
    });
  }

  // משקיע.
  if (input.hasInvestment) {
    items.push({
      formId: "1322 (נספח ג')",
      formName: "רווח הון מניירות ערך סחירים",
      why: "פירוט רווחי והפסדי ההון מניירות ערך — לכל חשבון מסחר. זה הנספח שמאפשר גם קיזוז הפסדים בין חשבונות, מקור החזר נפוץ למשקיעים.",
      attachments:
        input.investmentSource === "867"
          ? ["טופס 867 מהבנק/הברוקר הישראלי (אישור ניכוי מס במקור)"]
          : ["דוח שנתי מהברוקר הזר (Flex/Activity Statement)", "פירוט שערי ההמרה לפי ימי העסקאות"],
      kind: "appendix",
    });
    if (input.investmentSource === "flex") {
      items.push({
        formId: "1324 (נספח ד')",
        formName: "הכנסות מחו\"ל ומס ששולם בחו\"ל",
        why: "דיבידנדים מברוקר זר הם הכנסת חוץ; כאן דורשים את זיכוי המס הזר שנוכה במקור — כדי לא לשלם מס כפול.",
        attachments: ["אישור ניכוי המס הזר (מופיע בדוח הברוקר)"],
        kind: "appendix",
      });
    }
  }

  // דירה מושכרת.
  if (input.hasRental) {
    if (input.rentalTrack === "marginal") {
      items.push({
        formId: "1321 (נספח ב')",
        formName: "הכנסה מנכס בית (מסלול שולי)",
        why: "פירוט הכנסות השכירות וההוצאות המוכרות (ריבית משכנתא, תיקונים, פחת) — כך דורשים את ההוצאות שמקטינות את המס.",
        attachments: [
          "חוזה שכירות",
          "אישור שנתי מהבנק על ריבית המשכנתא",
          "קבלות על תיקונים/ביטוח/דמי ניהול",
          "טופס פחת (יא) אם נדרש פחת",
        ],
        kind: "appendix",
      });
    } else if (input.rentalTrack === "flat10") {
      items.push({
        formId: "ס' 122",
        formName: "דיווח ותשלום במסלול 10%",
        why: "במסלול המופחת משלמים 10% מהשכירות ברוטו — בדרך כלל בתשלום עצמאי עד 30 בינואר של השנה העוקבת (באתר רשות המסים). אם מגישים דוח שנתי, ההכנסה מדווחת בו במסלול זה.",
        attachments: ["חוזה שכירות", "אסמכתת התשלום (אם שולם)"],
        kind: "appendix",
      });
    } else {
      items.push({
        formId: "פטור",
        formName: "מסלול הפטור — תיעוד בלבד",
        why:
          "בפטור מלא אין דיווח חובה, אבל חשוב לשמור תיעוד שמוכיח שסך השכירות מתחת לתקרה — למקרה של ביקורת. " +
          "אם הפטור חלקי (שכ\"ד מעל התקרה), החלק החייב מדווח בדוח השנתי בנספח ב'.",
        attachments: ["חוזה שכירות", "תיעוד תקבולי השכירות (העברות בנקאיות)"],
        kind: "attachment",
      });
    }
  }

  const mustFileReason = input.hasSelfEmployment
    ? "כעצמאי"
    : hasForeignIncome
      ? "בגלל הכנסה מחו\"ל (ברוקר זר), שטופס 135 אינו תומך בה"
      : "בגלל הכנסת שכירות במסלול 10% או השולי";
  const filingExplanation = mustFile
    ? `במצב שלך קיימת חובת הגשת דוח שנתי מלא (1301) — ${mustFileReason} — ללא קשר להחזר. את ההחזר מקבלים דרך הדוח.`
    : "במצב שלך אין חובת הגשה — אבל מגיעה לך הזכות להגיש בקשת החזר (טופס 135) עד 6 שנים אחורה. אם החישוב מראה החזר, שווה להגיש. הערה: גם רווחי הון מברוקר ישראלי עשויים לחייב 1301 במקרים מסוימים — אם יש לך תיק נייר ערך פעיל, כדאי לוודא.";

  const howToFile = [
    "ההגשה נעשית באזור האישי באתר רשות המסים (מערכת מס הכנסה אונליין) או דרך מייצג (רו\"ח/יועץ מס).",
    "סרקו מראש את כל המסמכים שברשימה — המערכת מבקשת לצרף אותם כקבצים.",
    "החזר מאושר מועבר ישירות לחשבון הבנק, בדרך כלל תוך מספר שבועות עד חודשים, בתוספת ריבית והצמדה.",
  ];

  return { mustFile, filingExplanation, items, howToFile };
}
