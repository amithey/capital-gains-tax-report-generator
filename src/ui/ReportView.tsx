import type { AnnualTaxResult } from "@/tax-engine";
import { ils, num } from "./format";

function Card({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "pos" | "neg" }) {
  const valueColor = tone === "pos" ? "text-emerald-700" : tone === "neg" ? "text-rose-700" : "text-slate-900";
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-1 text-lg font-semibold tabular-nums ${valueColor}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

const th = "px-3 py-2 text-right text-xs font-medium text-slate-500";
const td = "px-3 py-2 text-right text-sm tabular-nums";

export function ReportView({ result }: { result: AnnualTaxResult }) {
  const cg = result.capitalGains;
  const netIsGain = cg.netGainIls >= 0;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">דוח מס — הכנסות השקעה, שנת {result.taxYear}</h2>

      {/* כרטיסי סיכום */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Card
          label={netIsGain ? "רווח הון נטו" : "הפסד הון נטו"}
          value={ils(Math.abs(cg.netGainIls))}
          tone={netIsGain ? "pos" : "neg"}
          hint={`רווחים ${ils(cg.totalGainsIls)} · הפסדים ${ils(cg.totalLossesIls)}`}
        />
        <Card label="מס רווח הון" value={ils(result.capitalGainsTaxIls)} />
        <Card label="דיבידנד ברוטו" value={ils(result.dividends.grossDividendIls)} />
        <Card
          label="מס זר שנוכה (בר-זיכוי)"
          value={ils(result.dividends.foreignTaxWithheldIls)}
          hint={`נוצל לזיכוי: ${ils(result.foreignTaxCreditIls)}`}
        />
        <Card label="מס דיבידנד (נטו לזיכוי)" value={ils(result.dividendNetTaxIls)} />
        <Card label="סך מס על הכנסות השקעה" value={ils(result.investmentTaxIls)} />
      </div>

      {/* טבלת מימושים */}
      <section className="rounded-lg border border-slate-200 bg-white">
        <header className="border-b border-slate-100 px-4 py-3 font-semibold">פירוט מימושי הון (לפי FIFO)</header>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className={th}>נייר</th>
                <th className={th}>מטבע</th>
                <th className={th}>תאריך רכישה</th>
                <th className={th}>תאריך מכירה</th>
                <th className={th}>כמות</th>
                <th className={th}>בסיס עלות (₪)</th>
                <th className={th}>תמורה (₪)</th>
                <th className={th}>רווח/הפסד (₪)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cg.lines.map((l, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className={`${td} font-medium`}>{l.symbol}</td>
                  <td className={td}>{l.currency}</td>
                  <td className={td}>{l.acquisitionDate}</td>
                  <td className={td}>{l.saleDate}</td>
                  <td className={td}>{num(l.quantity)}</td>
                  <td className={td}>{num(l.costBasisIls)}</td>
                  <td className={td}>{num(l.proceedsIls)}</td>
                  <td className={`${td} ${l.gainIls >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                    {num(l.gainIls)}
                  </td>
                </tr>
              ))}
              {cg.lines.length === 0 && (
                <tr><td className="px-3 py-4 text-sm text-slate-400" colSpan={8}>אין מימושי הון בשנה זו.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* דיבידנדים */}
      {result.dividends.lines.length > 0 && (
        <section className="rounded-lg border border-slate-200 bg-white">
          <header className="border-b border-slate-100 px-4 py-3 font-semibold">דיבידנדים ומס שנוכה</header>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className={th}>נייר</th>
                  <th className={th}>תאריך</th>
                  <th className={th}>ברוטו (₪)</th>
                  <th className={th}>מס זר שנוכה (₪)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.dividends.lines.map((l, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className={`${td} font-medium`}>{l.symbol}</td>
                    <td className={td}>{l.date}</td>
                    <td className={td}>{num(l.grossIls)}</td>
                    <td className={td}>{num(l.withheldIls)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* הסברים והנחות */}
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
          <h3 className="text-sm font-semibold text-amber-900">אזהרות חישוב</h3>
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
