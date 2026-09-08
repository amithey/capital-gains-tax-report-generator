import type { RefundResult } from "@/tax-engine";
import { ils } from "./format";

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between py-1.5 ${strong ? "font-semibold" : ""}`}>
      <span className="text-slate-600">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

export function RefundView({ result }: { result: RefundResult }) {
  const refund = result.isRefund;
  return (
    <div className="space-y-5">
      {/* כותרת תוצאה */}
      <div className={`rounded-xl border p-6 text-center ${refund ? "border-emerald-300 bg-emerald-50" : "border-rose-300 bg-rose-50"}`}>
        <div className="text-sm text-slate-600">{result.refundIls === 0 ? "אין הפרש מס באומדן הנוכחי" : refund ? "אומדן החזר מס לפי הנתונים שהוזנו" : "אומדן חבות מס נוספת"}</div>
        <div className={`mt-1 text-4xl font-bold tabular-nums ${refund ? "text-emerald-700" : "text-rose-700"}`}>
          {ils(Math.abs(result.refundIls))}
        </div>
        <div className="mt-1 text-xs text-slate-500">שנת מס {result.taxYear} · אומדן בלבד, טעון אימות רו"ח</div>
      </div>

      {/* פירוט החישוב */}
      <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <h3 className="mb-2 font-semibold">איך הגענו למספר</h3>
        <Row label="הכנסה חייבת ממשכורת" value={ils(result.totalSalaryIncomeIls)} />
        <Row label="מס לפי מדרגות" value={ils(result.salaryGrossTaxIls)} />
        <Row label="פחות: שווי נקודות זיכוי" value={`− ${ils(result.creditPointsValueIls)}`} />
        <Row label="פחות: זיכויים נוספים" value={`− ${ils(result.otherCreditsIls)}`} />
        <Row label="חבות מס על הכנסה ממודרגת" value={ils(result.salaryTaxLiabilityIls)} strong />
        {result.investmentTaxLiabilityIls > 0 && (
          <Row label="חבות מס על השקעות" value={ils(result.investmentTaxLiabilityIls)} />
        )}
        {result.rentalTaxLiabilityIls > 0 && (
          <Row label="חבות מס על שכירות" value={ils(result.rentalTaxLiabilityIls)} />
        )}
        {result.surtaxIls > 0 && <Row label="מס יסף (3%)" value={ils(result.surtaxIls)} />}
        <div className="my-2 border-t border-slate-100" />
        <Row label="סך חבות המס" value={ils(result.totalLiabilityIls)} strong />
        <Row label="סך המס שכבר נוכה" value={ils(result.totalWithheldIls)} strong />
        <div className="my-2 border-t border-slate-100" />
        <Row label={refund ? "אומדן החזר" : "אומדן חבות נוספת"} value={ils(Math.abs(result.refundIls))} strong />
      </section>

      {/* פירוט לפי מקור הכנסה */}
      {result.sources.length > 1 && (
        <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <h3 className="mb-2 font-semibold">פירוט לפי מקור הכנסה</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-right text-xs text-slate-500">
                <th className="py-1.5 font-medium">מקור</th>
                <th className="py-1.5 font-medium">הכנסה חייבת</th>
                <th className="py-1.5 font-medium">מס מחושב</th>
                <th className="py-1.5 font-medium">שולם/נוכה</th>
              </tr>
            </thead>
            <tbody>
              {result.sources.map((s) => (
                <tr key={s.id} className="border-b border-slate-50">
                  <td className="py-1.5">{s.label}</td>
                  <td className="py-1.5 tabular-nums">
                    {s.taxableIncomeIls !== undefined ? ils(s.taxableIncomeIls) : "—"}
                  </td>
                  <td className="py-1.5 tabular-nums">{ils(s.taxIls)}</td>
                  <td className="py-1.5 tabular-nums">{ils(s.withheldIls)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* אזהרות */}
      {result.warnings.length > 0 && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <ul className="list-disc space-y-1 pr-5 text-sm text-amber-900">
            {result.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </section>
      )}

      {/* מה חסר / מה יכול להגדיל */}
      {result.missing.length > 0 && (
        <section className="rounded-lg border border-sky-200 bg-sky-50 p-4">
          <h3 className="text-sm font-semibold text-sky-900">מה עוד עשוי לשנות את התוצאה</h3>
          <ul className="mt-2 list-disc space-y-1 pr-5 text-sm text-sky-800">
            {result.missing.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <ul className="list-disc space-y-1 pr-5 text-xs text-slate-500">
          {result.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
