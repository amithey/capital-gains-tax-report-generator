import { DISCLAIMER_FULL } from "@/report/disclaimer";

export function DisclaimerBanner() {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <span className="font-semibold">הבהרה: </span>
      {DISCLAIMER_FULL}
    </div>
  );
}
