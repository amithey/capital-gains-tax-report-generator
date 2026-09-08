"use client";
import { useMemo } from "react";
import { RefundView } from "@/ui/RefundView";
import { useWizard } from "../wizard-state";
import { FormsChecklist } from "../FormsChecklist";
import { PrintableSummary } from "../PrintableSummary";
import { prepareFiling } from "../prepare-filing";

export function ResultsStep() {
  const { fields, imported, flexResult, steps, dispatch } = useWizard();
  const { issues, result, guide } = useMemo(() => prepareFiling(fields, imported, flexResult), [fields, imported, flexResult]);
  return <>
    <div className="space-y-6 print:hidden">
      {result ? <RefundView result={result} /> : <section className="space-y-3" aria-labelledby="incomplete-title">
        <h2 id="incomplete-title" className="text-xl font-bold">לפני שנציג אומדן כולל</h2>
        <p className="text-sm">חסרים נתונים או שיש בתיק מקרה שעדיין לא נתמך בחישוב. אפשר להכין רשימת מסמכים, אבל לא לקבוע כרגע כמה החזר צפוי.</p>
        <ul className="space-y-3">{issues.map((issue) => <li key={issue.field} className="border-b border-slate-200 pb-3 text-sm">
          <p>{issue.message}</p>
          <button type="button" className="mt-1 text-sky-700 underline" onClick={() => {
            const index = steps.findIndex((step) => step.id === issue.step);
            dispatch({ type: "goToStep", index: Math.max(0, index) });
          }}>חזרה לפרטים הרלוונטיים</button>
        </li>)}</ul>
      </section>}
      {guide && <>
        <section className="space-y-3">
          <h3 className="text-lg font-bold">תיק ההכנה שלכם</h3>
          <p className="text-sm text-slate-600">מה לאסוף, אילו טפסים לבדוק ומה עדיין חסר. זו אינה הגשה לרשות המסים.</p>
          <FormsChecklist guide={guide} />
        </section>
        <button type="button" onClick={() => window.print()} className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700">הדפסת תיק ההכנה / שמירה כ-PDF</button>
      </>}
      <p className="text-xs">אינו מהווה ייעוץ מס; יש לאמת מול רואה חשבון.</p>
    </div>
    {guide ? <PrintableSummary result={result} guide={guide} issues={issues.map((issue) => issue.message)} /> : <p className="hidden print:block">לא ניתן להפיק תיק לשנת מס שאינה נתמכת. אינו מהווה ייעוץ מס; יש לאמת מול רואה חשבון.</p>}
  </>;
}
