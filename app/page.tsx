"use client";

import { WizardProvider } from "@/ui/wizard/wizard-state";
import { WizardShell } from "@/ui/wizard/WizardShell";

export default function Home() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl space-y-8 bg-white px-4 py-6 sm:px-8 md:py-10 print:p-0">
      <header className="app-header border-b border-teal-100 px-4 py-5 sm:px-6 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">מחשבון החזר מס</h1>
          <span className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-600">גרסת הכנה</span>
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
          מהנתונים שלכם לאומדן ולרשימת מסמכים. העיבוד בדפדפן; הפלט עדיין אינו דוח רשמי להגשה.
        </p>
      </header>

      <WizardProvider>
        <WizardShell />
      </WizardProvider>
    </main>
  );
}
