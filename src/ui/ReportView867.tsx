import type { Form867 } from "@/parsers/form-867";
import type { Form867TaxResult } from "@/tax-engine";
import { ils, num } from "./format";

function Card({ label, value, hint, tone }: { label: string; value: string; hint?: string | undefined; tone?: "pos" | "neg" | undefined }) {
  const color = tone === "pos" ? "text-emerald-700" : tone === "neg" ? "text-rose-700" : "text-slate-900";
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-1 text-lg font-semibold tabular-nums ${color}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

export function ReportView867({ form, result }: { form: Form867; result: Form867TaxResult }) {
  const isRefund = result.capitalGainsBalanceIls < 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-bold">דוח מס מטופס 867 — שנת {result.taxYear}</h2>
        <span className="text-sm text-slate-500">
          חשבון {form.identity.accountNumber ?? "—"} · תיק ניכויים {form.identity.withholdingFileId ?? "—"}
        </span>
      </div>

      <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
        זהו טופס של ברוקר ישראלי — הרווח/הפסד כבר חושב בשקלים. לא נדרשו שערי חליפין או התאמת lots.
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Card label="רווח חייב (לפני קיזוז)" value={ils(result.totalGainsIls)} />
        <Card label="הפסד בר-קיזוז" value={ils(result.offsettableLossesIls)} />
        <Card label="רווח חייב נטו" value={ils(result.netTaxableGainIls)} hint={result.carryForwardLossIls > 0 ? `הפסד להעברה: ${ils(result.carryForwardLossIls)}` : undefined} />
        <Card label="מס רווח הון מחושב" value={ils(result.capitalGainsTaxDueIls)} />
        <Card label="מס שנוכה במקור" value={ils(result.capitalGainsTaxWithheldIls)} />
        <Card
          label={isRefund ? "צפי החזר (רווח הון)" : "חבות נוספת (רווח הון)"}
          value={ils(Math.abs(result.capitalGainsBalanceIls))}
          tone={isRefund ? "pos" : "neg"}
        />
        <Card label="מחזור מכירות" value={ils(result.turnoverIls)} hint={`${num(result.transactionsCount, 0)} עסקאות`} />
        {result.dividendGrossIls > 0 && (
          <>
            <Card label="דיבידנד ברוטו" value={ils(result.dividendGrossIls)} />
            <Card label="מס דיבידנד (אומדן)" value={ils(result.dividendTaxIls)} />
          </>
        )}
      </div>

      <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-semibold text-slate-700">מה הדוח הזה מחשב (והנחות שבבסיסו)</h3>
        <ul className="mt-2 list-disc space-y-1 pr-5 text-sm text-slate-600">
          {result.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      </section>

      {result.warnings.length > 0 && (
        <section className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <h3 className="text-sm font-semibold text-amber-900">אזהרות</h3>
          <ul className="mt-2 list-disc space-y-1 pr-5 text-sm text-amber-800">
            {result.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
