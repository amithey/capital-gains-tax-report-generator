"use client";

import { useMemo } from "react";
import { computeRefund } from "@/tax-engine";
import { buildFormsGuide } from "@/report/forms-guide";
import { RefundView } from "@/ui/RefundView";
import { useWizard } from "../wizard-state";
import { buildRefundInput, employersFromFields } from "../build-refund-input";
import { FormsChecklist } from "../FormsChecklist";
import { PrintableSummary } from "../PrintableSummary";

/**
 * מסך התוצאות — אומדן ההחזר המאוחד, פירוט לפי מקור, מדריך הטפסים,
 * וכפתור הדפסה/שמירה כ-PDF.
 */
export function ResultsStep() {
  const { fields, imported, flexResult } = useWizard();

  const result = useMemo(
    () => computeRefund(buildRefundInput(fields, imported, flexResult)),
    [fields, imported, flexResult],
  );

  const guide = useMemo(() => {
    const employerCount = employersFromFields(fields).length;
    return buildFormsGuide({
      taxYear: fields.taxYear,
      hasEmployment: fields.profiles.employee && employerCount > 0,
      employerCount,
      hasSelfEmployment: fields.profiles.selfEmployed && fields.seRevenue.trim() !== "",
      hasInvestment: Boolean(imported),
      ...(imported ? { investmentSource: imported.kind === "867" ? ("867" as const) : ("flex" as const) } : {}),
      hasRental: Boolean(result.rentalChosenTrack),
      ...(result.rentalChosenTrack ? { rentalTrack: result.rentalChosenTrack } : {}),
    });
  }, [fields, imported, result.rentalChosenTrack]);

  return (
    <>
      <div className="space-y-6 print:hidden">
        <RefundView result={result} />

        <section className="space-y-3">
          <h3 className="text-lg font-bold">מה מגישים למס הכנסה?</h3>
          <p className="text-sm text-slate-600">
            האתר לא מגיש עבורך כלום — הוא מחשב ומכין אותך. הנה בדיוק מה צריך להגיש ומה לצרף:
          </p>
          <FormsChecklist guide={guide} />
        </section>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-md bg-slate-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            🖨️ הדפסה / שמירה כ-PDF
          </button>
        </div>
      </div>

      <PrintableSummary result={result} guide={guide} />
    </>
  );
}
