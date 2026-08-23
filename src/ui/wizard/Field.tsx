"use client";

/** שדה קלט מספרי משותף לשלבי האשף (RTL עם תוכן LTR למספרים). */
export function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      {hint && <span className="text-xs text-slate-400">{hint}</span>}
      <input
        type="text"
        inputMode="decimal"
        dir="ltr"
        className="rounded-md border border-slate-300 px-3 py-1.5 text-right"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
