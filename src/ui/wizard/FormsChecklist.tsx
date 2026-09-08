"use client";

import type { FormsGuide } from "@/report/forms-guide";

/** צ'קליסט הטפסים — מה להגיש, למה, ומה לצרף. משמש גם בתצוגה וגם בהדפסה. */
export function FormsChecklist({ guide }: { guide: FormsGuide }) {
  return (
    <div className="space-y-4">
      <div
        className={`rounded-lg border p-4 text-sm ${
          guide.route === "review" ? "border-amber-300 bg-amber-50 text-amber-900" : "border-sky-200 bg-sky-50 text-sky-900"
        }`}
      >
        <strong>מסלול הגשה לבדיקה: </strong>
        {guide.filingExplanation}
      </div>

      <section className="border-r-4 border-amber-400 pr-3 text-sm">
        <h4 className="font-semibold">מה חסר לפני הגשה?</h4>
        <ul className="mt-1 list-disc space-y-1 pr-5">{guide.readinessIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
      </section>

      <ol className="space-y-3">
        {guide.items.map((item, i) => (
          <li key={i} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-baseline gap-2">
              <span
                className={`rounded px-2 py-0.5 text-xs font-bold ${
                  item.kind === "main" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                {item.formId}
              </span>
              <span className="font-semibold">{item.formName}</span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{item.why}</p>
            <a className="text-xs text-sky-700 underline" href={item.sourceUrl} target="_blank" rel="noreferrer">מקור וטפסים באתר רשות המסים (חלון חדש)</a>
            {item.attachments.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-xs text-slate-500">
                {item.attachments.map((a, j) => (
                  <li key={j}>☐ {a}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>

      <details className="text-sm">
        <summary className="cursor-pointer font-medium">התשובות שעליהן מבוססת הרשימה</summary>
        <dl className="mt-2 space-y-2">{guide.answers.map((answer) => <div key={answer.label}><dt>{answer.label}</dt><dd className="font-medium">{answer.answer}</dd></div>)}</dl>
      </details>
      <p className="text-xs text-slate-500">שנת מס {guide.taxYear}. מקורות נבדקו: {guide.researchedAt}. אישור איסוף מסמכים הוא הצהרת המשתמש בלבד.</p>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h4 className="text-sm font-semibold">איך מגישים?</h4>
        <ul className="mt-1.5 list-disc space-y-1 pr-5 text-xs text-slate-600">
          {guide.howToFile.map((h, i) => (
            <li key={i}>{h}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
