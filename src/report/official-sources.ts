/** מקורות רשות המסים שנבדקו במחקר 08.09.2026; אין בכך אישור מקצועי למנוע החישוב. */
export const RESEARCH_DATE = "2026-09-08";
export const OFFICIAL_SOURCES = {
  refund: { title: "בקשת החזר מס וטופס 135", url: "https://www.gov.il/he/service/itc135" },
  annual2024: { title: "דוח שנתי ונספחים לשנת 2024", url: "https://www.gov.il/he/service/reporting-and-payment-2024-annual-tax-report-for-individuals" },
  annual2025: { title: "דוח שנתי ונספחים לשנת 2025", url: "https://www.gov.il/he/service/reporting-and-payment-2025-annual-tax-report-for-individuals" },
  rental: { title: "דיווח על השכרת נכסים", url: "https://www.gov.il/he/service/request-open-employee" },
  micro: { title: "דיווח שנתי מקוצר לעסק זעיר", url: "https://www.gov.il/he/service/report-and-payment-for-micro-business-owner" },
  property: { title: "הצהרה על עסקת מקרקעין", url: "https://www.gov.il/he/service/real-estate-tax-7000" },
  amendment: { title: "בקשה לתיקון שומת מקרקעין - 7085", url: "https://www.gov.il/he/service/real-estate-tax-inst-7085" },
  retirement: { title: "בקשה לפריסת הכנסה - 116ג", url: "https://www.gov.il/he/service/itc-request-spread-income-over-number-years" },
  degree: { title: "זיכוי עבור לימודים - 119", url: "https://www.gov.il/he/pages/itc119" },
} as const;

export function annualSource(year: number) {
  if (year === 2024) return OFFICIAL_SOURCES.annual2024;
  if (year === 2025) return OFFICIAL_SOURCES.annual2025;
  throw new Error("אין מפת טפסים מאומתת לשנת המס שנבחרה.");
}
