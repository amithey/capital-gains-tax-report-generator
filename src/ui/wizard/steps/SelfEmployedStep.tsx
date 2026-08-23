"use client";

import { EXPENSE_CATALOG, getTaxYearConfig } from "@/tax-engine";
import { ils } from "@/ui/format";
import { InfoTip } from "@/ui/Tooltip";
import { num, useWizard } from "../wizard-state";
import { selfEmployedFromFields } from "../build-refund-input";
import { Field } from "../Field";

/**
 * שלב העצמאי — מחזור, קטלוג הוצאות מוכרות עם הסברים, והפקדות.
 * החלק ההסברתי הוא הלב: לכל קטגוריה "מה זה?" שמסביר מתי ההוצאה מוכרת.
 */
export function SelfEmployedStep() {
  const { fields, dispatch } = useWizard();
  const config = getTaxYearConfig(fields.taxYear);

  function expenseValue(categoryId: string): { amount: string; pct: string } {
    const row = fields.seExpenses.find((e) => e.categoryId === categoryId);
    return { amount: row?.amount ?? "", pct: row?.businessUsePercent ?? "" };
  }

  function setExpense(categoryId: string, patch: { amount?: string; businessUsePercent?: string }): void {
    const existing = fields.seExpenses.find((e) => e.categoryId === categoryId);
    const rows = existing
      ? fields.seExpenses.map((e) => (e.categoryId === categoryId ? { ...e, ...patch } : e))
      : [...fields.seExpenses, { categoryId, amount: "", businessUsePercent: "", ...patch }];
    dispatch({ type: "set", patch: { seExpenses: rows } });
  }

  // תצוגה חיה של הרווח החייב המצטבר.
  const live = selfEmployedFromFields(fields);

  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed text-slate-600">
        <strong>הוצאה מוכרת</strong> היא כל הוצאה שהוצאתם כדי לייצר את ההכנסה מהעסק — והיא מקטינה את
        ההכנסה שעליה תשלמו מס. רבים מפסידים כסף פשוט כי לא ידעו שמותר לדרוש. עברו על הרשימה — ליד כל
        קטגוריה יש הסבר קצר מתי היא מוכרת ואילו קבלות לשמור.
      </p>

      <Field
        label="סך ההכנסות מהעסק (מחזור שנתי)"
        hint="כל התקבולים מהעסק לפני הוצאות — מתוך החשבוניות/הקבלות שהוצאתם"
        value={fields.seRevenue}
        onChange={(v) => dispatch({ type: "set", patch: { seRevenue: v } })}
        placeholder="0"
      />

      <div className="space-y-3">
        <h3 className="font-semibold">הוצאות מוכרות</h3>
        {EXPENSE_CATALOG.map((cat) => {
          const v = expenseValue(cat.id);
          return (
            <div key={cat.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-48 flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    {cat.label}
                    {cat.kind === "capped" && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                        מוכר {Math.round(cat.recognizedShare * 100)}%
                      </span>
                    )}
                  </div>
                  <InfoTip>
                    <strong>{cat.explanation}</strong>
                    <br />
                    <span className="text-slate-600">מתי מוכר: {cat.whenRecognized}</span>
                    <br />
                    <span className="text-slate-500">מסמכים: {cat.documentation}</span>
                  </InfoTip>
                </div>
                <div className="w-36">
                  <Field
                    label="סכום שנתי"
                    value={v.amount}
                    onChange={(amount) => setExpense(cat.id, { amount })}
                    placeholder="0"
                  />
                </div>
                {cat.kind === "proportional" && (
                  <div className="w-32">
                    <Field
                      label="% עסקי"
                      hint={`ברירת מחדל ${Math.round(cat.recognizedShare * 100)}%`}
                      value={v.pct}
                      onChange={(businessUsePercent) => setExpense(cat.id, { businessUsePercent })}
                      placeholder={String(Math.round(cat.recognizedShare * 100))}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold">הפקדות ותשלומים (הטבות מס לעצמאים)</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field
            label="הפקדות לפנסיה (עצמאי)"
            hint={`ניכוי עד ${Math.round(config.selfEmployed.pensionDeductionRate * 100)}% + זיכוי ${Math.round(config.selfEmployed.pensionCreditRate * 100)}% — מתוך האישור השנתי מקרן הפנסיה`}
            value={fields.sePensionDeposit}
            onChange={(v) => dispatch({ type: "set", patch: { sePensionDeposit: v } })}
            placeholder="0"
          />
          <Field
            label="הפקדות לקרן השתלמות (עצמאי)"
            hint={`ניכוי עד ${config.selfEmployed.studyFundDeductionRate * 100}% מההכנסה — מתוך האישור השנתי מהקרן`}
            value={fields.seStudyFund}
            onChange={(v) => dispatch({ type: "set", patch: { seStudyFund: v } })}
            placeholder="0"
          />
          <Field
            label="דמי ביטוח לאומי ששולמו"
            hint="ללא דמי בריאות — מתוך האישור השנתי מביטוח לאומי. 52% מוכרים כניכוי"
            value={fields.seNationalInsurance}
            onChange={(v) => dispatch({ type: "set", patch: { seNationalInsurance: v } })}
            placeholder="0"
          />
          <Field
            label="מקדמות מס הכנסה ששולמו"
            hint="סך המקדמות ששילמתם השנה — נחשבות כמס ששולם מראש"
            value={fields.seAdvances}
            onChange={(v) => dispatch({ type: "set", patch: { seAdvances: v } })}
            placeholder="0"
          />
        </div>
      </div>

      {live && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm">
          <div className="flex flex-wrap gap-x-8 gap-y-1">
            <span>
              הוצאות מוכרות: <strong className="tabular-nums">{ils(live.recognizedExpensesIls)}</strong>
            </span>
            <span>
              רווח מהעסק: <strong className="tabular-nums">{ils(live.netBusinessProfitIls)}</strong>
            </span>
            <span>
              הכנסה חייבת אחרי ניכויים: <strong className="tabular-nums">{ils(live.taxableBusinessIncomeIls)}</strong>
            </span>
          </div>
          {num(fields.seRevenue) > 0 && live.recognizedExpensesIls === 0 && (
            <p className="mt-2 text-emerald-800">
              לא הזנתם הוצאות — כמעט לכל עסק יש לפחות טלפון, נסיעות או הנהלת חשבונות. שווה לבדוק את הרשימה למעלה.
            </p>
          )}
        </div>
      )}

      <p className="text-xs text-slate-400">
        המחשבון מכסה מס הכנסה בלבד. דמי ביטוח לאומי של עצמאים מחושבים בנפרד מול המוסד לביטוח לאומי.
      </p>
    </div>
  );
}
