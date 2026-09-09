"use client";

import type { RefundResult } from "@/tax-engine";
import type { FormsGuide } from "@/report/forms-guide";
import { DISCLAIMER_FULL } from "@/report/disclaimer";
import { ils } from "@/ui/format";
import { FormsChecklist } from "./FormsChecklist";

/**
 * מסך הסיכום להדפסה/שמירה כ-PDF (Ctrl+P → "שמירה כ-PDF").
 * מוצג רק בהדפסה (hidden print:block) — משתמש באותם נתונים של מסך התוצאות.
 * בחרנו בהדפסת דפדפן ולא בספריית PDF כי התמיכה בעברית/RTL בספריות JS חלשה,
 * וכך אין תלות נוספת והפלט זהה לתצוגה.
 */
export function PrintableSummary({ result, guide, issues = [] }: { result: RefundResult | null; guide: FormsGuide; issues?: readonly string[] }) {
  if (!result) return <div className="hidden print:block" dir="rtl">
    <h1 className="text-xl font-bold">תיק הכנה להחזר מס - שנת {guide.taxYear}</h1>
    <p className="my-3 font-semibold">אין אומדן כולל: חסרים נתונים או נדרש חישוב שאינו נתמך. מסמך זה אינו דוח רשמי להגשה.</p>
    <ul className="mb-4 list-disc pr-5 text-sm">{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
    <FormsChecklist guide={guide} />
    <p className="mt-6 border-t pt-3 text-xs">{DISCLAIMER_FULL}</p>
  </div>;
  const refund = result.isRefund;
  return (
    <div className="hidden print:block" dir="rtl">
      <h1 className="text-xl font-bold">סיכום אומדן החזר מס — שנת {result.taxYear}</h1>
      <p className="mt-1 text-sm text-slate-600">
        הופק בתאריך {new Date().toLocaleDateString("he-IL")} · אומדן בלבד, טעון אימות רו"ח
      </p>
      <p className="mt-2 text-sm font-semibold">
        טיוטת חישוב בלבד — אינה טופס רשמי להגשה לרשות המסים ואינה אישור זכאות להחזר.
      </p>
      {result.missing.length > 0 && (
        <section className="mt-4 border border-slate-300 p-3">
          <h2 className="font-bold">מידע חסר שעשוי לשנות את התוצאה</h2>
          <ul className="mt-2 list-disc pr-5 text-sm">
            {result.missing.map((message, index) => <li key={index}>{message}</li>)}
          </ul>
        </section>
      )}
      {result.notes.length > 0 && (
        <section className="mt-4 text-sm">
          <h2 className="font-bold">הנחות ומגבלות החישוב</h2>
          <ul className="mt-2 list-disc pr-5">
            {result.notes.map((message, index) => <li key={index}>{message}</li>)}
          </ul>
        </section>
      )}

      <div className="mt-4 border border-slate-300 p-4 text-center">
        <div className="text-sm">{refund ? "אומדן החזר המס" : "אומדן חבות מס נוספת"}</div>
        <div className="text-3xl font-bold tabular-nums">{ils(Math.abs(result.refundIls))}</div>
      </div>

      <h2 className="mt-5 text-base font-bold">פירוט לפי מקור הכנסה</h2>
      {result.businessCustomerWithheldIls > 0 && <p className="text-sm">בתשלומי העסק נכללו מקדמות בסך {ils(result.businessAdvancesPaidIls)} וניכוי בידי לקוחות בסך {ils(result.businessCustomerWithheldIls)}.</p>}
      <table className="mt-2 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-400 text-right">
            <th className="py-1">מקור</th>
            <th className="py-1">הכנסה חייבת</th>
            <th className="py-1">מס מחושב</th>
            <th className="py-1">שולם/נוכה</th>
          </tr>
        </thead>
        <tbody>
          {result.sources.map((s) => (
            <tr key={s.id} className="border-b border-slate-200">
              <td className="py-1">{s.label}</td>
              <td className="py-1 tabular-nums">{s.taxableIncomeIls !== undefined ? ils(s.taxableIncomeIls) : "—"}</td>
              <td className="py-1 tabular-nums">{ils(s.taxIls)}</td>
              <td className="py-1 tabular-nums">{ils(s.withheldIls)}</td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td className="py-1">סה"כ</td>
            <td />
            <td className="py-1 tabular-nums">{ils(result.totalLiabilityIls)}</td>
            <td className="py-1 tabular-nums">{ils(result.totalWithheldIls)}</td>
          </tr>
        </tbody>
      </table>

      <h2 className="mt-5 text-base font-bold">
        טפסים ואסמכתאות לבדיקה לפני הגשה
      </h2>
      <p className="text-sm">{guide.filingExplanation}</p>
      <ul className="my-2 list-disc pr-5 text-sm">{guide.readinessIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
      <ol className="mt-2 space-y-3 text-sm">
        {guide.items.map((item, i) => (
          <li key={i} className="border-b border-slate-200 pb-2">
            <strong>
              {item.formId} — {item.formName}
            </strong>
            <p className="text-slate-700">{item.why}</p>
            <a href={item.sourceUrl} className="break-all text-xs underline">מקור רשמי: {item.sourceUrl}</a>
            {item.attachments.length > 0 && (
              <ul className="mt-1 text-xs text-slate-600">
                {item.attachments.map((a, j) => (
                  <li key={j}>☐ {a}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
      <h2 className="mt-4 font-bold">תשובות בדיקת שלמות התיק</h2>
      <dl className="text-xs">{guide.answers.map((answer) => <div key={answer.label}><dt>{answer.label}</dt><dd>{answer.answer}</dd></div>)}</dl>
      <h2 className="mt-4 font-bold">המשך להגשה</h2>
      <ul className="list-disc pr-5 text-xs">{guide.howToFile.map((step) => <li key={step}>{step}</li>)}</ul>
      <p className="mt-2 text-xs">מקורות נבדקו: {guide.researchedAt}</p>

      {result.warnings.length > 0 && (
        <>
          <h2 className="mt-5 text-base font-bold">אזהרות</h2>
          <ul className="mt-1 list-disc pr-5 text-xs text-slate-700">
            {result.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-6 border-t border-slate-300 pt-3 text-xs text-slate-500">{DISCLAIMER_FULL}</p>
    </div>
  );
}
