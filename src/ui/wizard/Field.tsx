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
      {hint && <span className="text-xs leading-5 text-zinc-600">{hint}</span>}
      <input
        type="text"
        inputMode="decimal"
        dir="ltr"
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-right tabular-nums transition-colors focus:border-emerald-700"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
