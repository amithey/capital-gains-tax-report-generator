"use client";

import type { FormsGuide } from "@/report/forms-guide";

/** צ'קליסט הטפסים — מה להגיש, למה, ומה לצרף. משמש גם בתצוגה וגם בהדפסה. */
export function FormsChecklist({ guide }: { guide: FormsGuide }) {
  return (
    <div className="space-y-4">
      <div
        className={`rounded-lg border p-4 text-sm ${
          guide.mustFile ? "border-amber-300 bg-amber-50 text-amber-900" : "border-sky-200 bg-sky-50 text-sky-900"
        }`}
      >
        <strong>{guide.mustFile ? "חובת הגשה: " : "אין חובת הגשה: "}</strong>
        {guide.filingExplanation}
      </div>

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
