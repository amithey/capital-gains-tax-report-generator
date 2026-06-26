"use client";

import { supportedTaxYears } from "@/tax-engine";
import { useWizard, type ProfileId } from "../wizard-state";

const PROFILES: { id: ProfileId; title: string; emoji: string; description: string }[] = [
  {
    id: "employee",
    title: "שכיר/ה",
    emoji: "💼",
    description: "קיבלתם טופס 106 ממעסיק (אחד או יותר). החלפתם עבודה? עבדתם בשני מקומות? סיכוי טוב להחזר.",
  },
  {
    id: "selfEmployed",
    title: "עצמאי/ת",
    emoji: "🧾",
    description: "עוסק פטור או מורשה. נעבור יחד על ההוצאות המוכרות — גם כאלה שלא ידעתם שמגיע לכם לדרוש.",
  },
  {
    id: "investor",
    title: "משקיע/ה בשוק ההון",
    emoji: "📈",
    description: "מסחר דרך ברוקר ישראלי (טופס 867) או זר (IBKR). נחשב את המס על רווחים ודיבידנדים.",
  },
  {
    id: "landlord",
    title: "דירה להשקעה",
    emoji: "🏠",
    description: "משכירים דירת מגורים? נשווה בין שלושת מסלולי המס ונמצא את הזול ביותר עבורכם.",
  },
];

export function ProfileSelectStep() {
  const { fields, dispatch } = useWizard();
  const years = supportedTaxYears();

  return (
    <div className="space-y-6">
      <p className="text-slate-600">
        בחרו את כל מה שמתאר אתכם בשנת המס — אפשר (וכדאי) לסמן יותר מאחד. המחשבון יאחד את כל
        ההכנסות לחישוב אחד, כי כך גם מס הכנסה מחשב.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PROFILES.map((p) => {
          const selected = fields.profiles[p.id];
          return (
            <button
              key={p.id}
              type="button"
              role="checkbox"
              aria-checked={selected}
              onClick={() => dispatch({ type: "toggleProfile", profile: p.id })}
              className={`rounded-xl border-2 p-4 text-right transition ${
                selected
                  ? "border-slate-900 bg-slate-50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-400"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">
                  {p.emoji} {p.title}
                </span>
                <span
                  aria-hidden
                  className={`flex h-6 w-6 items-center justify-center rounded-full border text-sm ${
                    selected ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 text-transparent"
                  }`}
                >
                  ✓
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{p.description}</p>
            </button>
          );
        })}
      </div>

      <label className="flex items-center gap-3 text-sm">
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
        <span className="text-xs text-slate-400">אפשר להגיש בקשת החזר עד 6 שנים אחורה (כרגע נתמכות 2024–2025).</span>
      </label>
    </div>
  );
}
