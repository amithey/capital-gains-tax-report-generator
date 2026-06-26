"use client";

import { useState, type ReactNode } from "react";

/**
 * "מה זה?" — גילוי-הסבר נגיש. מיושם כ-disclosure בלחיצה (לא hover) כך שהוא
 * עובד גם במובייל וגם במקלדת. הטקסט נפתח מתחת לאלמנט.
 */
export function InfoTip({ label = "מה זה?", children }: { label?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="inline-block">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-sky-700 underline decoration-dotted hover:text-sky-900"
      >
        {label}
      </button>
      {open && (
        <span className="mt-1 block rounded-md border border-sky-100 bg-sky-50 p-2 text-xs leading-relaxed text-slate-700">
          {children}
        </span>
      )}
    </span>
  );
}
