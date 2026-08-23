"use client";

import { useMemo, useState } from "react";
import {
  computeRefund,
  type EmployerIncome,
  type InvestmentTaxInput,
} from "@/tax-engine";
import { RefundView } from "./RefundView";

interface EmployerRow {
  name: string;
  income: string;
  withheld: string;
}

function n(s: string | undefined): number {
  const v = Number(String(s ?? "").replace(/,/g, ""));
  return Number.isFinite(v) ? v : 0;
}

function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      {hint && <span className="text-xs text-slate-400">{hint}</span>}
      <input
        type="text"
        inputMode="decimal"
        dir="ltr"
        className="rounded-md border border-slate-300 px-3 py-1.5 text-right"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function RefundSection({
  taxYear,
  investment,
  investmentLabel,
  creditPoints,
  onCreditPointsChange,
}: {
  taxYear: number;
  investment?: InvestmentTaxInput | undefined;
  investmentLabel?: string | undefined;
  /** ערך נקודות זיכוי (נשלט מבחוץ — מוזן ע"י בודק הזכאות, ניתן לעריכה ידנית). */
  creditPoints: string;
  onCreditPointsChange: (v: string) => void;
}) {
  const [employers, setEmployers] = useState<EmployerRow[]>([{ name: "", income: "", withheld: "" }]);
  const [pension, setPension] = useState("");
  const [life, setLife] = useState("");
  const [donations, setDonations] = useState("");

  const result = useMemo(() => {
    const emps: EmployerIncome[] = employers
      .filter((e) => e.income.trim() !== "" || e.withheld.trim() !== "")
      .map((e) => ({
        taxableIncomeIls: n(e.income),
        taxWithheldIls: n(e.withheld),
        ...(e.name.trim() ? { employerName: e.name.trim() } : {}),
      }));
    return computeRefund({
      taxYear,
      employers: emps,
      creditPoints: n(creditPoints),
      credits: {
        ...(pension.trim() ? { pensionEmployeeIls: n(pension) } : {}),
        ...(life.trim() ? { lifeInsuranceIls: n(life) } : {}),
        ...(donations.trim() ? { donationsIls: n(donations) } : {}),
      },
      ...(investment ? { investment } : {}),
    });
  }, [employers, creditPoints, pension, life, donations, taxYear, investment]);

  function updateEmployer(i: number, patch: Partial<EmployerRow>): void {
    setEmployers((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  }

  return (
    <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
      <div>
        <h2 className="text-lg font-bold">חישוב החזר מס — שנת {taxYear}</h2>
        <p className="mt-1 text-sm text-slate-500">
          הזן את הנתונים מטופס 106 שקיבלת מהמעסיק. כל שדה מציין היכן למצוא אותו בטופס. אפשר להזין רק חלק — נציין מה חסר ומה זה משנה.
        </p>
      </div>

      {investment && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
          צורף אוטומטית דוח השקעות{investmentLabel ? ` (${investmentLabel})` : ""} — מס ההשקעות שוקלל בחישוב ההחזר.
        </div>
      )}

      {/* מעסיקים */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">הכנסה ממעסיק (טופס 106)</h3>
        {employers.map((e, i) => (
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
            {employers.length > 1 && (
              <button
                type="button"
                className="text-xs text-rose-600 hover:underline md:col-span-3 md:text-left"
                onClick={() => setEmployers((prev) => prev.filter((_, idx) => idx !== i))}
              >
                הסר מעסיק
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="text-sm text-sky-700 hover:underline"
          onClick={() => setEmployers((prev) => [...prev, { name: "", income: "", withheld: "" }])}
        >
          + הוסף מעסיק (אם עבדת ביותר ממקום אחד — מקור נפוץ להחזר)
        </button>
      </div>

      {/* זיכויים */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field
          label="נקודות זיכוי"
          hint="מחושב אוטומטית מבדיקת הזכאות למעלה. ניתן לעדכן ידנית."
          value={creditPoints}
          onChange={onCreditPointsChange}
        />
        <Field label="הפקדות לפנסיה (עובד)" hint="שדה 045/086 — זיכוי 45א" value={pension} onChange={setPension} placeholder="0" />
        <Field label="ביטוח חיים" hint="שדה 036/081" value={life} onChange={setLife} placeholder="0" />
        <Field label="תרומות למוסד מוכר" hint="שדה 037/237 — זיכוי לפי ס'46" value={donations} onChange={setDonations} placeholder="0" />
      </div>

      <RefundView result={result} />
    </section>
  );
}
