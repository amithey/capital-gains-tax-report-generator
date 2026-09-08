"use client";

import { useState } from "react";
import { parseManualRatesCsv } from "@/rates";
import { computeFrom867, supportedTaxYears, type Form867TaxResult } from "@/tax-engine";
import { importFile } from "@/ui/import-file";
import { computeReport, inferTaxYear } from "@/ui/compute-report";
import { ActivityTables } from "@/ui/ActivityTables";
import { ReportView } from "@/ui/ReportView";
import { ReportView867 } from "@/ui/ReportView867";
import { useWizard } from "../wizard-state";

/**
 * שלב המשקיע — העלאת טופס 867 (PDF) או Flex Query (XML) וחישוב מס ההשקעות.
 * הלוגיקה הועברה מ-page.tsx הישן; התוצאות נשמרות ב-context של האשף
 * ומשוקללות אוטומטית בחישוב ההחזר במסך התוצאות.
 */
export function InvestorStep() {
  const {
    fields,
    dispatch,
    imported,
    setImported,
    flexResult,
    setFlexResult,
    importedFileName,
    setImportedFileName,
  } = useWizard();

  const [error, setError] = useState<string | null>(null);
  const [computing, setComputing] = useState(false);
  const [computeError, setComputeError] = useState<string | null>(null);
  const [needManualRates, setNeedManualRates] = useState(false);

  const years = supportedTaxYears();
  const form867Result: Form867TaxResult | null =
    imported?.kind === "867" ? computeFrom867(imported.form) : null;

  async function handleFile(file: File): Promise<void> {
    setError(null);
    setImported(null);
    setFlexResult(null);
    setComputeError(null);
    setNeedManualRates(false);
    setImportedFileName(file.name);
    try {
      const result = await importFile(file);
      setImported(result);
      if (result.kind === "flex") {
        const inferred = inferTaxYear(result.activity);
        if (inferred && years.includes(inferred)) {
          dispatch({ type: "set", patch: { taxYear: inferred } });
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה לא צפויה בקריאת הקובץ.");
    }
  }

  async function runCompute(manualCsv?: string): Promise<void> {
    if (imported?.kind !== "flex") return;
    setComputing(true);
    setComputeError(null);
    try {
      const manualRates = manualCsv ? parseManualRatesCsv(manualCsv) : undefined;
      const r = await computeReport(imported.activity, {
        taxYear: fields.taxYear,
        substantialShareholder: fields.substantialShareholder,
        ...(manualRates ? { manualRates } : {}),
      });
      setFlexResult(r);
      setNeedManualRates(false);
    } catch (e) {
      setComputeError(e instanceof Error ? e.message : "שגיאה בחישוב.");
      setNeedManualRates(true);
    } finally {
      setComputing(false);
    }
  }

  return (
    <div className="space-y-5">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white p-10 text-center hover:border-slate-400">
        <span className="font-medium">בחר/י קובץ — טופס 867 (PDF) או Flex Query (XML)</span>
        <span className="text-sm text-slate-500">העיבוד מתבצע במלואו בדפדפן — הקובץ אינו נשלח לשום שרת.</span>
        <input
          type="file"
          accept=".pdf,.xml,application/pdf,text/xml,application/xml"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
      </label>

      {importedFileName && !error && <p className="text-sm text-slate-500">קובץ: {importedFileName}</p>}

      {error && (
        <div className="rounded-lg border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>
      )}

      {/* מסלול 867 — ברוקר ישראלי */}
      {imported?.kind === "867" && form867Result && (
        <ReportView867 form={imported.form} result={form867Result} />
      )}

      {/* מסלול Flex — ברוקר זר */}
      {imported?.kind === "flex" && (
        <>
          <ActivityTables activity={imported.activity} />

          <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="font-semibold">חישוב הדוח</h3>
            <div className="flex flex-wrap items-end gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={fields.substantialShareholder}
                  onChange={(e) => dispatch({ type: "set", patch: { substantialShareholder: e.target.checked } })}
                />
                בעל מניות מהותי (≥10%) — שיעור 30%
              </label>
              <button
                type="button"
                onClick={() => void runCompute()}
                disabled={computing}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {computing ? "מחשב…" : "משוך שערים מבנק ישראל וחשב"}
              </button>
            </div>
            <p className="text-xs text-slate-400">
              השערים נמשכים מבנק ישראל (שער יציג ליום העסקה) דרך שרת-ביניים. אם המשיכה נכשלת — ניתן להעלות קובץ שערים ידני.
            </p>

            {computeError && (
              <div className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">{computeError}</div>
            )}

            {needManualRates && (
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-600">העלאת שערים ידנית (CSV: תאריך,מטבע,שער)</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void f.text().then((c) => runCompute(c));
                  }}
                />
              </label>
            )}
          </section>

          {flexResult && <ReportView result={flexResult} />}
        </>
      )}

      {!imported && (
        <p className="text-sm text-slate-500">
          אין לכם את הקובץ עכשיו? אפשר להמשיך ולחזור לשלב הזה בהמשך. לא נציג אומדן החזר מאוחד עד להשלמת דוח ההשקעות.
        </p>
      )}
    </div>
  );
}
