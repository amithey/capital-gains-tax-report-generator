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
  const { fields, steps, currentStep, next, back } = useWizard();
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
    <div className="space-y-6">
      {/* פס התקדמות */}
      <nav aria-label="שלבי האשף" className="overflow-x-auto print:hidden">
        <ol className="flex min-w-max items-center gap-1 text-xs md:gap-2 md:text-sm">
          {steps.map((s, i) => {
            const state = i < stepIndex ? "done" : i === stepIndex ? "current" : "todo";
            return (
              <li key={s.id} className="flex items-center gap-1 md:gap-2">
                {i > 0 && <span className="text-slate-300">←</span>}
                <span
                  aria-current={state === "current" ? "step" : undefined}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
                    state === "current"
                      ? "bg-slate-900 font-medium text-white"
                      : state === "done"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <span className="tabular-nums">{state === "done" ? "✓" : i + 1}</span>
                  <span className="hidden sm:inline">{s.title}</span>
                </span>
              </li>
            );
          })}
        </ol>
        <p className="mt-1 text-xs text-slate-400 sm:hidden">
          שלב {stepIndex + 1} מתוך {steps.length}: {currentStep.title}
        </p>
      </nav>

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
            className="rounded-md bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40"
          >
            {currentStep.id === "profile" ? "מתחילים ←" : "הבא ←"}
          </button>
        )}
      </div>

      <div className="print:hidden">
        <DisclaimerBanner />
      </div>
    </div>
  );
}
