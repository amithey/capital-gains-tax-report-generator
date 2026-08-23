"use client";

import { useEffect, useMemo, useState } from "react";
import { computeCreditPoints, type CreditPointsProfile } from "@/tax-engine";
import { ils } from "./format";

function NumField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-700">{label}</span>
      <input
        type="text"
        inputMode="numeric"
        dir="ltr"
        className="w-20 rounded-md border border-slate-300 px-2 py-1 text-center"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
      />
    </label>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function int(s: string): number {
  const v = parseInt(s.replace(/\D/g, ""), 10);
  return Number.isFinite(v) ? v : 0;
}

/**
 * "בודק זכאות" מודרך — מחשב נקודות זיכוי לפי מצב אישי בשפה פשוטה, ומציג פירוט שקוף.
 * מדווח את התוצאה כלפי מעלה (onPoints) כדי להזין את מחשבון ההחזר.
 */
export function EligibilityWizard({
  taxYear,
  monthlyPointValue,
  onPoints,
}: {
  taxYear: number;
  monthlyPointValue: number;
  onPoints: (points: number) => void;
}) {
  const [isWoman, setIsWoman] = useState(false);
  const [singleParent, setSingleParent] = useState(false);
  const [c0, setC0] = useState("");
  const [c1, setC1] = useState("");
  const [c6, setC6] = useState("");
  const [c18, setC18] = useState("");
  const [newImmigrant, setNewImmigrant] = useState(false);
  const [soldier, setSoldier] = useState(false);
  const [degree, setDegree] = useState(false);

  const result = useMemo(() => {
    const profile: CreditPointsProfile = {
      isWoman,
      singleParent,
      childrenBirthYear: int(c0),
      children1to5: int(c1),
      children6to17: int(c6),
      children18: int(c18),
      newImmigrant,
      dischargedSoldier: soldier,
      academicDegree: degree,
    };
    return computeCreditPoints(taxYear, profile);
  }, [isWoman, singleParent, c0, c1, c6, c18, newImmigrant, soldier, degree, taxYear]);

  useEffect(() => {
    onPoints(result.total);
  }, [result.total, onPoints]);

  const annualValue = result.total * monthlyPointValue * 12;

  return (
    <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
      <div>
        <h2 className="text-lg font-bold">בדיקת זכאות — נקודות זיכוי</h2>
        <p className="mt-1 text-sm text-slate-500">
          ענה על כמה שאלות פשוטות. כל נקודת זיכוי מפחיתה לך מהמס כ-{ils(monthlyPointValue * 12)} בשנה.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" checked={!isWoman} onChange={() => setIsWoman(false)} /> גבר
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={isWoman} onChange={() => setIsWoman(true)} /> אישה
            </label>
          </div>
          <Check label="אני הורה יחיד/ה" checked={singleParent} onChange={setSingleParent} />
          <Check label="עולה חדש/ה (ב-3.5 השנים האחרונות)" checked={newImmigrant} onChange={setNewImmigrant} />
          <Check label="חייל/ת או שירות לאומי משוחרר/ת (ב-3 השנים האחרונות)" checked={soldier} onChange={setSoldier} />
          <Check label="סיימתי תואר אקדמי לאחרונה" checked={degree} onChange={setDegree} />
        </div>

        <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
          <div className="text-sm font-medium text-slate-700">ילדים (מספר בכל גיל)</div>
          <NumField label="נולדו השנה" value={c0} onChange={setC0} />
          <NumField label="גיל 1–5" value={c1} onChange={setC1} />
          <NumField label="גיל 6–17" value={c6} onChange={setC6} />
          <NumField label="גיל 18" value={c18} onChange={setC18} />
        </div>
      </div>

      {/* תוצאה */}
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-slate-600">מגיעות לך</span>
          <span className="text-2xl font-bold text-emerald-700 tabular-nums">{result.total.toFixed(2)} נקודות</span>
        </div>
        <div className="mt-1 text-xs text-slate-500">שווי שנתי משוער: {ils(annualValue)} הפחתה במס</div>
        <ul className="mt-3 space-y-1 text-sm text-slate-600">
          {result.breakdown.map((b, i) => (
            <li key={i} className="flex justify-between">
              <span>{b.label}</span>
              <span className="tabular-nums">{b.points.toFixed(2)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-400">{result.note}</p>
      </div>
    </section>
  );
}
