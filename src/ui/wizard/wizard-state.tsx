"use client";

import { createContext, useContext, useMemo, useReducer, useState, type ReactNode } from "react";
import type { AnnualTaxResult } from "@/tax-engine";
import type { ImportResult } from "@/ui/import-file";
import { EMPTY_FILING_PROFILE, type FilingProfile } from "@/report/filing-profile";

/**
 * ה-state המרכזי של האשף — דף יחיד מונחה-צעדים (לא ראוטים), כי כל העיבוד
 * בדפדפן וקבצים מפורסרים לא שורדים רענון ממילא. שדות קלט נשמרים כמחרוזות
 * (כמו ביתר הקוד) והמרה למספרים נעשית רק בחישוב.
 */

export type ProfileId = "employee" | "selfEmployed" | "investor" | "landlord";

export interface EmployerRow {
  name: string;
  income: string;
  withheld: string;
}

export interface ExpenseRow {
  categoryId: string;
  amount: string;
  businessUsePercent: string;
}

export interface WizardFields {
  filing: FilingProfile;
  profiles: Record<ProfileId, boolean>;
  taxYear: number;
  stepIndex: number;
  // שכיר
  employers: EmployerRow[];
  pension: string;
  life: string;
  donations: string;
  // נקודות זיכוי
  creditPoints: string;
  // עצמאי
  seRevenue: string;
  seExpenses: ExpenseRow[];
  sePensionDeposit: string;
  seStudyFund: string;
  seNationalInsurance: string;
  seAdvances: string;
  // דירה מושכרת
  rentMonthly: string;
  rentMonths: string;
  rentMortgageInterest: string;
  rentRepairs: string;
  rentManagement: string;
  rentInsurance: string;
  rentOther: string;
  rentDepreciationBasis: string;
  rentAge60: boolean;
  rentTaxPaid: string;
  /** "auto" = המסלול המומלץ. */
  rentChosenTrack: "auto" | "exempt" | "flat10" | "marginal";
  // משקיע
  substantialShareholder: boolean;
}

export const initialFields: WizardFields = {
  filing: { ...EMPTY_FILING_PROFILE },
  profiles: { employee: false, selfEmployed: false, investor: false, landlord: false },
  taxYear: 2024,
  stepIndex: 0,
  employers: [{ name: "", income: "", withheld: "" }],
  pension: "",
  life: "",
  donations: "",
  creditPoints: "2.25",
  seRevenue: "",
  seExpenses: [],
  sePensionDeposit: "",
  seStudyFund: "",
  seNationalInsurance: "",
  seAdvances: "",
  rentMonthly: "",
  rentMonths: "12",
  rentMortgageInterest: "",
  rentRepairs: "",
  rentManagement: "",
  rentInsurance: "",
  rentOther: "",
  rentDepreciationBasis: "",
  rentAge60: false,
  rentTaxPaid: "",
  rentChosenTrack: "auto",
  substantialShareholder: false,
};

export type WizardAction =
  | { type: "set"; patch: Partial<WizardFields> }
  | { type: "toggleProfile"; profile: ProfileId }
  | { type: "goToStep"; index: number };

function reducer(state: WizardFields, action: WizardAction): WizardFields {
  switch (action.type) {
    case "set":
      return { ...state, ...action.patch };
    case "toggleProfile":
      return {
        ...state,
        profiles: { ...state.profiles, [action.profile]: !state.profiles[action.profile] },
      };
    case "goToStep":
      return { ...state, stepIndex: action.index };
  }
}

export type StepId =
  | "profile"
  | "employee"
  | "selfEmployed"
  | "investor"
  | "rental"
  | "creditPoints"
  | "filing"
  | "results";

export interface StepMeta {
  id: StepId;
  title: string;
}

/** רצף הצעדים נבנה דינמית לפי הפרופילים שנבחרו. */
export function buildSteps(profiles: Record<ProfileId, boolean>): StepMeta[] {
  const steps: StepMeta[] = [{ id: "profile", title: "מי אתם?" }];
  if (profiles.employee) steps.push({ id: "employee", title: "משכורת (טופס 106)" });
  if (profiles.selfEmployed) steps.push({ id: "selfEmployed", title: "עסק והוצאות מוכרות" });
  if (profiles.investor) steps.push({ id: "investor", title: "שוק ההון" });
  if (profiles.landlord) steps.push({ id: "rental", title: "דירה מושכרת" });
  steps.push({ id: "creditPoints", title: "נקודות זיכוי" });
  steps.push({ id: "filing", title: "בדיקת שלמות התיק" });
  steps.push({ id: "results", title: "תוצאה וטפסים" });
  return steps;
}

interface WizardContextValue {
  fields: WizardFields;
  dispatch: (action: WizardAction) => void;
  steps: StepMeta[];
  currentStep: StepMeta;
  next: () => void;
  back: () => void;
  // נתוני משקיע (לא ניתנים לסריאליזציה — קובץ מפורסר ותוצאת חישוב שערים)
  imported: ImportResult | null;
  setImported: (r: ImportResult | null) => void;
  flexResult: AnnualTaxResult | null;
  setFlexResult: (r: AnnualTaxResult | null) => void;
  importedFileName: string | null;
  setImportedFileName: (s: string | null) => void;
}

const WizardContext = createContext<WizardContextValue | null>(null);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [fields, dispatch] = useReducer(reducer, initialFields);
  const [imported, setImported] = useState<ImportResult | null>(null);
  const [flexResult, setFlexResult] = useState<AnnualTaxResult | null>(null);
  const [importedFileName, setImportedFileName] = useState<string | null>(null);

  const steps = useMemo(() => buildSteps(fields.profiles), [fields.profiles]);
  const stepIndex = Math.min(fields.stepIndex, steps.length - 1);
  const currentStep = steps[stepIndex] ?? steps[0]!;

  const value: WizardContextValue = {
    fields,
    dispatch,
    steps,
    currentStep,
    next: () => dispatch({ type: "goToStep", index: Math.min(stepIndex + 1, steps.length - 1) }),
    back: () => dispatch({ type: "goToStep", index: Math.max(stepIndex - 1, 0) }),
    imported,
    setImported,
    flexResult,
    setFlexResult,
    importedFileName,
    setImportedFileName,
  };

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

export function useWizard(): WizardContextValue {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard חייב לרוץ בתוך WizardProvider");
  return ctx;
}

/** המרת מחרוזת קלט למספר (פסיקים נסבלים). */
export function num(s: string | undefined): number {
  const v = Number(String(s ?? "").replace(/,/g, ""));
  return Number.isFinite(v) ? v : 0;
}
