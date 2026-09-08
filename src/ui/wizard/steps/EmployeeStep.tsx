"use client";

import { InfoTip } from "@/ui/Tooltip";
import { useWizard, type EmployerRow } from "../wizard-state";
import { Field } from "../Field";

/**
 * שלב השכיר — הזנת טופסי 106. חולץ מ-RefundSection.tsx הישן; ה-state חי
 * ב-wizard-state כדי שמסך התוצאות יוכל לחשב הכול יחד.
 */
export function EmployeeStep() {
  const { fields, dispatch } = useWizard();

  function updateEmployer(i: number, patch: Partial<EmployerRow>): void {
    dispatch({
      type: "set",
      patch: { employers: fields.employers.map((e, idx) => (idx === i ? { ...e, ...patch } : e)) },
    });
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600">
        הזינו את הנתונים מטופס 106 שקיבלתם מהמעסיק בסוף השנה (או עם עזיבה).{" "}
        <InfoTip label="מה זה טופס 106?">
          טופס 106 הוא סיכום שנתי שכל מעסיק חייב לתת לעובד: כמה הרווחתם וכמה מס נוכה. אם לא קיבלתם —
          בקשו מהמעסיק או הורידו מהאזור האישי באתר רשות המסים.
        </InfoTip>
      </p>

      <div className="space-y-3">
        <p className="text-sm text-slate-600">לא יודעים סכום? השאירו ריק וחזרו להשלימו. אם בטופס הסכום הוא אפס, הזינו 0. מעסיק שלא רלוונטי אפשר להסיר.</p>
        {fields.employers.map((e, i) => (
          <div key={i} className="grid grid-cols-1 gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 md:grid-cols-3">
            <Field label="שם מעסיק (לא חובה)" value={e.name} onChange={(v) => updateEmployer(i, { name: v })} />
            <Field
              label="הכנסה חייבת"
              hint="שדה 158/172 בטופס 106"
              value={e.income}
              onChange={(v) => updateEmployer(i, { income: v })}
              placeholder="0"
            />
            <Field
              label="מס הכנסה שנוכה"
              hint="שדה 042 בטופס 106"
              value={e.withheld}
              onChange={(v) => updateEmployer(i, { withheld: v })}
              placeholder="0"
            />
            {fields.employers.length > 1 && (
              <button
                type="button"
                className="text-xs text-rose-600 hover:underline md:col-span-3 md:text-left"
                onClick={() =>
                  dispatch({ type: "set", patch: { employers: fields.employers.filter((_, idx) => idx !== i) } })
                }
              >
                הסר מעסיק
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="text-sm text-sky-700 hover:underline"
          onClick={() =>
            dispatch({
              type: "set",
              patch: { employers: [...fields.employers, { name: "", income: "", withheld: "" }] },
            })
          }
        >
          + הוסף מעסיק (אם עבדת ביותר ממקום אחד — מקור נפוץ להחזר)
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Field
          label="הפקדות לפנסיה (עובד)"
          hint="שדה 045/086 — זיכוי 45א"
          value={fields.pension}
          onChange={(v) => dispatch({ type: "set", patch: { pension: v } })}
          placeholder="0"
        />
        <Field
          label="ביטוח חיים"
          hint="שדה 036/081"
          value={fields.life}
          onChange={(v) => dispatch({ type: "set", patch: { life: v } })}
          placeholder="0"
        />
        <Field
          label="תרומות למוסד מוכר"
          hint="שדה 037/237 — זיכוי לפי ס'46"
          value={fields.donations}
          onChange={(v) => dispatch({ type: "set", patch: { donations: v } })}
          placeholder="0"
        />
      </div>
    </div>
  );
}
