"use client";

import { useEffect, useRef } from "react";
import { DisclaimerBanner } from "@/ui/Disclaimer";
import { useWizard } from "./wizard-state";
import { ProfileSelectStep } from "./steps/ProfileSelectStep";
import { EmployeeStep } from "./steps/EmployeeStep";
import { SelfEmployedStep } from "./steps/SelfEmployedStep";
import { InvestorStep } from "./steps/InvestorStep";
import { RentalStep } from "./steps/RentalStep";
import { CreditPointsStep } from "./steps/CreditPointsStep";
import { ResultsStep } from "./steps/ResultsStep";
import { FilingStep } from "./steps/FilingStep";

/**
 * מעטפת האשף: פס התקדמות, תוכן הצעד הנוכחי, וניווט קדימה/אחורה.
 * ניהול פוקוס: בכל מעבר צעד הפוקוס עובר לכותרת הצעד (נגישות).
 */
export function WizardShell() {
  const { fields, steps, currentStep, next, back, dispatch } = useWizard();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [currentStep.id]);

  const stepIndex = steps.findIndex((s) => s.id === currentStep.id);
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;
  const anyProfile = Object.values(fields.profiles).some(Boolean);
  const nextDisabled = currentStep.id === "profile" && !anyProfile;

  return (
    <div className="wizard-layout">
      {/* פס התקדמות */}
      <nav aria-label="שלבי האשף" className="min-w-0 border-b border-zinc-200 pb-4 md:border-b-0 md:border-l md:pl-5 print:hidden">
        <p className="mb-3 text-xs font-semibold text-zinc-500">שלב {stepIndex + 1} מתוך {steps.length}</p>
        <ol className="grid grid-cols-2 gap-1 md:grid-cols-1">
          {steps.map((s, i) => {
            const state = i < stepIndex ? "done" : i === stepIndex ? "current" : "todo";
            return (
              <li key={s.id} className="min-w-0">
                <button
                  type="button"
                  disabled={i > stepIndex}
                  onClick={() => dispatch({ type: "goToStep", index: i })}
                  aria-current={state === "current" ? "step" : undefined}
                  className="step-link"
                >
                  <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-current text-xs tabular-nums">{i + 1}</span>
                  <span>{s.title}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="wizard-content">
      <h2 ref={headingRef} tabIndex={-1} className="text-xl font-bold outline-none print:hidden">
        {currentStep.title}
      </h2>

      {/* תוכן הצעד */}
      {currentStep.id === "profile" && <ProfileSelectStep />}
      {currentStep.id === "employee" && <EmployeeStep />}
      {currentStep.id === "selfEmployed" && <SelfEmployedStep />}
      {currentStep.id === "investor" && <InvestorStep />}
      {currentStep.id === "rental" && <RentalStep />}
      {currentStep.id === "creditPoints" && <CreditPointsStep />}
      {currentStep.id === "filing" && <FilingStep />}
      {currentStep.id === "results" && <ResultsStep />}

      {/* ניווט */}
      <div className="flex items-center justify-between border-t border-slate-200 pt-4 print:hidden">
        <button
          type="button"
          onClick={back}
          disabled={isFirst}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:invisible"
        >
          → הקודם
        </button>
        {!isLast && (
          <button
            type="button"
            onClick={next}
            disabled={nextDisabled}
            className="primary-action"
          >
            {currentStep.id === "profile" ? "מתחילים ←" : "הבא ←"}
          </button>
        )}
      </div>

      <div className="print:hidden">
        <DisclaimerBanner />
      </div>
      </div>
    </div>
  );
}
