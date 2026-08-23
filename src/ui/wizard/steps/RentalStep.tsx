"use client";

import { useMemo } from "react";
import {
  compareRentalTracks,
  getTaxYearConfig,
  incomeTaxOnBrackets,
  type RentalTrackId,
} from "@/tax-engine";
import { ils } from "@/ui/format";
import { InfoTip } from "@/ui/Tooltip";
import { num, useWizard } from "../wizard-state";
import { employersFromFields, rentalFromFields, selfEmployedFromFields } from "../build-refund-input";
import { Field } from "../Field";

/**
 * שלב הדירה המושכרת — קלט + השוואת שלושת המסלולים בזמן אמת עם תג "מומלץ".
 * ההשוואה משתמשת בהכנסה הממודרגת שכבר הוזנה (משכורת+עסק) כדי שהמסלול
 * השולי ישקף את מיקום המשתמש האמיתי במדרגות.
 */
export function RentalStep() {
  const { fields, dispatch } = useWizard();
  const config = getTaxYearConfig(fields.taxYear);
  const cap = config.rental.monthlyExemptionCapIls;

  const comparison = useMemo(() => {
    const rental = rentalFromFields(fields);
    if (!rental || rental.monthlyRentIls <= 0) return null;
    const salaryIncome = fields.profiles.employee
      ? employersFromFields(fields).reduce((s, e) => s + e.taxableIncomeIls, 0)
      : 0;
    const businessIncome = selfEmployedFromFields(fields)?.taxableBusinessIncomeIls ?? 0;
    const base = salaryIncome + businessIncome;
    const baseTax = incomeTaxOnBrackets(base, config.marginalBrackets);
    return compareRentalTracks(rental, {
      taxOnAdditionalIncome: (amount) => incomeTaxOnBrackets(base + amount, config.marginalBrackets) - baseTax,
    });
  }, [fields, config]);

  const trackChoices: { id: "auto" | RentalTrackId; label: string }[] = [
    { id: "auto", label: "בחרו עבורי את המסלול הזול (מומלץ)" },
    { id: "exempt", label: "מסלול פטור" },
    { id: "flat10", label: "מסלול 10%" },
    { id: "marginal", label: "מסלול מס שולי" },
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed text-slate-600">
        על הכנסה מהשכרת דירת מגורים יש <strong>שלושה מסלולי מס</strong> — והבחירה ביניהם יכולה לשנות
        אלפי שקלים בשנה.{" "}
        <InfoTip label="מה ההבדל בין המסלולים?">
          <strong>פטור:</strong> עד {cap.toLocaleString()} ₪ לחודש — לא משלמים מס בכלל. מעל התקרה הפטור
          נשחק בהדרגה, ומעל כפל התקרה הוא נעלם.
          <br />
          <strong>10%:</strong> משלמים 10% מכל שקל של שכר דירה, בלי להכיר בהוצאות. פשוט ומשתלם כשההוצאות
          נמוכות.
          <br />
          <strong>שולי:</strong> שכר הדירה פחות הוצאות (ריבית משכנתא, תיקונים, פחת) מצטרף ליתר ההכנסות
          וממוסה במדרגות — משתלם כשההוצאות גבוהות.
        </InfoTip>
      </p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Field
          label="שכר דירה חודשי"
          hint={`תקרת הפטור ב-${fields.taxYear}: ${cap.toLocaleString()} ₪`}
          value={fields.rentMonthly}
          onChange={(v) => dispatch({ type: "set", patch: { rentMonthly: v } })}
          placeholder="0"
        />
        <Field
          label="חודשי השכרה בשנה"
          value={fields.rentMonths}
          onChange={(v) => dispatch({ type: "set", patch: { rentMonths: v } })}
          placeholder="12"
        />
        <Field
          label="מס ששולם כבר על השכירות"
          hint="למשל תשלום 10% — אם שולם"
          value={fields.rentTaxPaid}
          onChange={(v) => dispatch({ type: "set", patch: { rentTaxPaid: v } })}
          placeholder="0"
        />
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold">
          הוצאות (רלוונטיות למסלול השולי){" "}
          <InfoTip label="אילו הוצאות מוכרות על דירה?">
            ריבית על המשכנתא (לא ההחזר כולו — רק רכיב הריבית, מופיע באישור השנתי מהבנק), תיקונים שוטפים
            (לא שיפוץ משביח), דמי ניהול/תיווך, ביטוח מבנה, ופחת — 2% משווי המבנה (בלי הקרקע) בכל שנה.
          </InfoTip>
        </h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field
            label="ריבית משכנתא שנתית"
            hint="מהאישור השנתי של הבנק — רכיב הריבית בלבד"
            value={fields.rentMortgageInterest}
            onChange={(v) => dispatch({ type: "set", patch: { rentMortgageInterest: v } })}
            placeholder="0"
          />
          <Field
            label="תיקונים ואחזקה"
            value={fields.rentRepairs}
            onChange={(v) => dispatch({ type: "set", patch: { rentRepairs: v } })}
            placeholder="0"
          />
          <Field
            label="דמי ניהול / תיווך"
            value={fields.rentManagement}
            onChange={(v) => dispatch({ type: "set", patch: { rentManagement: v } })}
            placeholder="0"
          />
          <Field
            label="ביטוח מבנה"
            value={fields.rentInsurance}
            onChange={(v) => dispatch({ type: "set", patch: { rentInsurance: v } })}
            placeholder="0"
          />
          <Field
            label="הוצאות אחרות"
            value={fields.rentOther}
            onChange={(v) => dispatch({ type: "set", patch: { rentOther: v } })}
            placeholder="0"
          />
          <Field
            label="שווי המבנה (לפחת)"
            hint={`ללא רכיב הקרקע — פחת ${config.rental.depreciationRateDefault * 100}% לשנה`}
            value={fields.rentDepreciationBasis}
            onChange={(v) => dispatch({ type: "set", patch: { rentDepreciationBasis: v } })}
            placeholder="0"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={fields.rentAge60}
            onChange={(e) => dispatch({ type: "set", patch: { rentAge60: e.target.checked } })}
          />
          מלאו לי 60 בשנת המס{" "}
          <InfoTip label="למה זה משנה?">
            הכנסה פסיבית (כמו שכירות) של מי שטרם מלאו לו 60 ממוסה במסלול השולי החל ממדרגת 31%. מגיל 60
            חלות המדרגות הרגילות מ-10% — וזה יכול להוזיל משמעותית את המסלול השולי.
          </InfoTip>
        </label>
      </div>

      {/* השוואת מסלולים חיה */}
      {comparison && (
        <div className="space-y-3">
          <h3 className="font-semibold">השוואת המסלולים לנתונים שלך</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {comparison.tracks.map((t) => {
              const recommended = t.track === comparison.recommendedTrack;
              return (
                <div
                  key={t.track}
                  className={`rounded-xl border-2 p-4 ${
                    !t.available
                      ? "border-slate-100 bg-slate-50 opacity-60"
                      : recommended
                        ? "border-emerald-400 bg-emerald-50"
                        : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{t.label}</span>
                    {recommended && (
                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white">
                        מומלץ
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-2xl font-bold tabular-nums">
                    {t.available ? ils(t.taxIls) : "—"}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">{t.explanation}</p>
                </div>
              );
            })}
          </div>

          <label className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-medium text-slate-700">המסלול לחישוב:</span>
            <select
              className="rounded-md border border-slate-300 px-3 py-1.5"
              value={fields.rentChosenTrack}
              onChange={(e) =>
                dispatch({ type: "set", patch: { rentChosenTrack: e.target.value as typeof fields.rentChosenTrack } })
              }
            >
              {trackChoices.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          {comparison.notes.map((n, i) => (
            <p key={i} className="text-xs text-slate-500">
              {n}
            </p>
          ))}
        </div>
      )}

      {!comparison && num(fields.rentMonthly) === 0 && (
        <p className="text-sm text-slate-400">הזינו שכר דירה חודשי כדי לראות את השוואת המסלולים.</p>
      )}
    </div>
  );
}
