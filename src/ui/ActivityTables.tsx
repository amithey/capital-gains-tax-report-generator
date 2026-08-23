import type { ParsedActivity } from "@/parsers";

function num(n: number): string {
  return n.toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="font-semibold">{title}</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{count}</span>
      </header>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

const th = "px-3 py-2 text-right text-xs font-medium text-slate-500";
const td = "px-3 py-2 text-right text-sm tabular-nums";

export function ActivityTables({ activity }: { activity: ParsedActivity }) {
  return (
    <div className="space-y-6">
      <Section title="עסקאות" count={activity.trades.length}>
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className={th}>תאריך</th>
              <th className={th}>פעולה</th>
              <th className={th}>נייר</th>
              <th className={th}>כמות</th>
              <th className={th}>מחיר</th>
              <th className={th}>תמורה (ברוטו)</th>
              <th className={th}>עמלה</th>
              <th className={th}>מטבע</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {activity.trades.map((t, i) => (
              <tr key={t.sourceId ?? i} className="hover:bg-slate-50">
                <td className={td}>{t.date}</td>
                <td className={td}>
                  <span className={t.side === "BUY" ? "text-emerald-700" : "text-rose-700"}>
                    {t.side === "BUY" ? "קנייה" : "מכירה"}
                  </span>
                </td>
                <td className={`${td} font-medium`}>{t.symbol}</td>
                <td className={td}>{num(t.quantity)}</td>
                <td className={td}>{num(t.price)}</td>
                <td className={td}>{num(t.proceeds)}</td>
                <td className={td}>{num(t.commission)}</td>
                <td className={td}>{t.currency}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="דיבידנדים" count={activity.dividends.length}>
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className={th}>תאריך</th>
              <th className={th}>נייר</th>
              <th className={th}>סכום ברוטו</th>
              <th className={th}>מטבע</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {activity.dividends.map((d, i) => (
              <tr key={d.sourceId ?? i} className="hover:bg-slate-50">
                <td className={td}>{d.date}</td>
                <td className={`${td} font-medium`}>{d.symbol}</td>
                <td className={td}>{num(d.grossAmount)}</td>
                <td className={td}>{d.currency}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="מס שנוכה במקור" count={activity.withholdings.length}>
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className={th}>תאריך</th>
              <th className={th}>נייר</th>
              <th className={th}>סכום מס</th>
              <th className={th}>מטבע</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {activity.withholdings.map((w, i) => (
              <tr key={w.sourceId ?? i} className="hover:bg-slate-50">
                <td className={td}>{w.date}</td>
                <td className={`${td} font-medium`}>{w.symbol}</td>
                <td className={td}>{num(w.amount)}</td>
                <td className={td}>{w.currency}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {activity.warnings.length > 0 && (
        <Section title="אזהרות בקריאת הקובץ" count={activity.warnings.length}>
          <ul className="list-disc space-y-1 px-8 py-3 text-sm text-slate-600">
            {activity.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
