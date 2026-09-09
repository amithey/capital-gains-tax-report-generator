"use client";

import { supportedTaxYears } from "@/tax-engine";
import { useWizard, type ProfileId } from "../wizard-state";

const PROFILES: { id: ProfileId; title: string; description: string }[] = [
  {
    id: "employee",
    title: "שכיר/ה",
    description: "משכורת ממעסיק אחד או יותר, לפי טופסי 106.",
  },
  {
    id: "selfEmployed",
    title: "עצמאי/ת",
    description: "הכנסות מעסק, הוצאות ומקדמות מס.",
  },
  {
    id: "investor",
    title: "משקיע/ה בשוק ההון",
    description: "דוח 867 מבנק או ברוקר ישראלי, או דוח IBKR.",
  },
  {
    id: "landlord",
    title: "דירה להשקעה",
    description: "הכנסות מהשכרת דירת מגורים בישראל.",
  },
];

export function ProfileSelectStep() {
  const { fields, dispatch } = useWizard();
  const years = supportedTaxYears();

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-600">
        אילו מקורות הכנסה היו לכם בשנת המס? סמנו את כל האפשרויות המתאימות.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PROFILES.map((p) => {
          const selected = fields.profiles[p.id];
          return (
            <label
              key={p.id}
              className={`cursor-pointer rounded-lg border p-4 text-right transition-colors ${
                selected
                  ? "border-emerald-700 bg-emerald-50"
                  : "border-zinc-200 bg-white hover:border-zinc-400"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold">
                  {p.title}
                </span>
                <input type="checkbox" checked={selected} onChange={() => dispatch({ type: "toggleProfile", profile: p.id })} className="h-5 w-5 shrink-0 accent-emerald-800" />
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{p.description}</p>
            </label>
          );
        })}
      </div>

      <label className="flex flex-wrap items-center gap-3 border-t border-zinc-200 pt-5 text-sm">
        <span className="font-medium text-slate-700">שנת המס לחישוב:</span>
        <select
          className="rounded-md border border-slate-300 px-3 py-1.5"
          value={fields.taxYear}
          onChange={(e) => dispatch({ type: "set", patch: { taxYear: Number(e.target.value) } })}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <span className="text-xs text-zinc-600">כרגע נתמכות השנים 2024–2025.</span>
      </label>
    </div>
  );
}
