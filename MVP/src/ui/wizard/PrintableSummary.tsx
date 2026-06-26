"use client";

import type { RefundResult } from "@/tax-engine";
import type { FormsGuide } from "@/report/forms-guide";
import { DISCLAIMER_FULL } from "@/report/disclaimer";
import { ils } from "@/ui/format";

/**
 * מסך הסיכום להדפסה/שמירה כ-PDF (Ctrl+P → "שמירה כ-PDF").
 * מוצג רק בהדפסה (hidden print:block) — משתמש באותם נתונים של מסך התוצאות.
 * בחרנו בהדפסת דפדפן ולא בספריית PDF כי התמיכה בעברית/RTL בספריות JS חלשה,
 * וכך אין תלות נוספת והפלט זהה לתצוגה.
 */
export function PrintableSummary({ result, guide }: { result: RefundResult; guide: FormsGuide }) {
  const refund = result.isRefund;
  return (
    <div className="hidden print:block" dir="rtl">
      <h1 className="text-xl font-bold">סיכום אומדן החזר מס — שנת {result.taxYear}</h1>
      <p className="mt-1 text-sm text-slate-600">
        הופק בתאריך {new Date().toLocaleDateString("he-IL")} · אומדן בלבד, טעון אימות רו"ח
      </p>

      <div className="mt-4 border border-slate-300 p-4 text-center">
        <div className="text-sm">{refund ? "אומדן החזר המס" : "אומדן חבות מס נוספת"}</div>
        <div className="text-3xl font-bold tabular-nums">{ils(Math.abs(result.refundIls))}</div>
      </div>

      <h2 className="mt-5 text-base font-bold">פירוט לפי מקור הכנסה</h2>
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
        {guide.mustFile ? "טפסים להגשה (חובת הגשה)" : "טפסים להגשת בקשת החזר (אין חובת הגשה)"}
      </h2>
      <ol className="mt-2 space-y-3 text-sm">
        {guide.items.map((item, i) => (
          <li key={i} className="border-b border-slate-200 pb-2">
            <strong>
              {item.formId} — {item.formName}
            </strong>
            <p className="text-slate-700">{item.why}</p>
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
