"use client";

import { useCallback } from "react";
import { getTaxYearConfig } from "@/tax-engine";
import { EligibilityWizard } from "@/ui/EligibilityWizard";
import { useWizard } from "../wizard-state";
import { Field } from "../Field";

/** שלב נקודות הזיכוי — מארח את בודק הזכאות הקיים ומאפשר עריכה ידנית. */
export function CreditPointsStep() {
  const { fields, dispatch } = useWizard();
  const monthlyPointValue = getTaxYearConfig(fields.taxYear).creditPointMonthlyValue;

  const handlePoints = useCallback(
    (p: number) => dispatch({ type: "set", patch: { creditPoints: p.toFixed(2) } }),
    [dispatch],
  );

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-slate-600">
        נקודות זיכוי הן "הנחה" קבועה במס שמגיעה לכם לפי המצב האישי — כל נקודה שווה{" "}
        {(monthlyPointValue * 12).toLocaleString()} ₪ בשנה. ענו על השאלות והמחשבון יעריך כמה נקודות
        מגיעות לכם.
      </p>

      <EligibilityWizard
        taxYear={fields.taxYear}
        monthlyPointValue={monthlyPointValue}
        onPoints={handlePoints}
      />

      <div className="max-w-xs">
        <Field
          label="סך נקודות הזיכוי"
          hint="מחושב אוטומטית מהשאלון. אפשר לעדכן ידנית אם אתם יודעים את המספר המדויק."
          value={fields.creditPoints}
          onChange={(v) => dispatch({ type: "set", patch: { creditPoints: v } })}
        />
      </div>
    </div>
  );
}
