"use client";
import { filingQuestions } from "@/report/filing-profile";
import { useWizard } from "../wizard-state";

export function FilingStep() {
  const { fields, dispatch } = useWizard();
  const questions = filingQuestions(fields.profiles.selfEmployed, fields.profiles.landlord);
  return <div className="space-y-6">
    <p className="text-sm text-slate-600">נבדוק מה עוד צריך להיכלל בתיק. אפשר לבחור ״לא בטוח״ ולקבל רשימת השלמות בלי אומדן שמתעלם מהכנסות חסרות.</p>
    {(["income", "filing", "documents"] as const).map((section) => <fieldset key={section} className="space-y-4 border-t border-slate-200 pt-3">
      <legend className="px-1 font-semibold">{section === "income" ? "הכנסות ומצב אישי" : section === "filing" ? "מסלול דיווח" : "מסמכים להגשה"}</legend>
      {questions.filter((q) => q.section === section).map((q) => <div key={q.key} className="grid gap-2 sm:grid-cols-[1fr_10rem] sm:gap-4">
        <div><label htmlFor={`filing-${q.key}`} className="text-sm font-medium">{q.label}</label><p id={`hint-${q.key}`} className="mt-1 text-xs leading-relaxed text-slate-600">{q.hint}</p></div>
        <select id={`filing-${q.key}`} aria-describedby={`hint-${q.key}`} value={fields.filing[q.key]} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm" onChange={(event) => {
          const answer = event.target.value;
          if (answer !== "unknown" && answer !== "yes" && answer !== "no") return;
          dispatch({ type: "set", patch: { filing: { ...fields.filing, [q.key]: answer } } });
        }}><option value="unknown">לא בטוח / טרם נבדק</option><option value="yes">כן</option><option value="no">לא</option></select>
      </div>)}
    </fieldset>)}
    <p className="text-xs text-slate-600">התשובות נשארות בזיכרון הדפדפן ונמחקות ברענון. אינו מהווה ייעוץ מס; יש לאמת מול רואה חשבון.</p>
  </div>;
}
