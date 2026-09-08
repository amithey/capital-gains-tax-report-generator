"use client";

import { WizardProvider } from "@/ui/wizard/wizard-state";
import { WizardShell } from "@/ui/wizard/WizardShell";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6 md:p-10 print:p-0">
      <header className="print:hidden">
        <h1 className="text-2xl font-bold">מחשבון החזר מס</h1>
        <p className="mt-1 text-slate-600">
          מרכזים הכנסות ומסמכים, בודקים מה חסר ומקבלים אומדן במקרים הנתמכים ורשימת טפסים לבדיקה.
          גרסת הכנה בלבד, עדיין לא דוח רשמי להגשה. החישוב והמסמכים מעובדים בדפדפן.
        </p>
      </header>

      <WizardProvider>
        <WizardShell />
      </WizardProvider>
    </main>
  );
}
