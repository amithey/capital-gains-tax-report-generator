/** עיצוב מספרים אחיד לתצוגה. */

export function ils(n: number): string {
  return n.toLocaleString("he-IL", {
    style: "currency",
    currency: "ILS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function num(n: number, digits = 2): string {
  return n.toLocaleString("he-IL", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
