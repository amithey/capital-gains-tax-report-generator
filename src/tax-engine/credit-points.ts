import { getTaxYearConfig } from "./config";

/**
 * ⚠️ אומדן — כללי נקודות הזיכוי מורכבים, תלויי-שנה ומגדר, וטעונים אימות רו"ח. ⚠️
 *
 * מחשב נקודות זיכוי לפי מצב אישי, עם פירוט שקוף (כל רכיב והנמקתו), כדי שהמשתמש —
 * וגם רו"ח — יוכלו לאמת כל מרכיב בנפרד. מכסה מקרים נפוצים; מקרים מיוחדים (נכות,
 * בני זוג, גירושין, חלוקת נקודות בין הורים) אינם ממומשים ב-MVP.
 */
export interface CreditPointsProfile {
  readonly isWoman: boolean;
  readonly singleParent: boolean;
  /** מספר ילדים בכל שכבת גיל (פישוט; לכל הורה). */
  readonly childrenBirthYear: number;
  readonly children1to5: number;
  readonly children6to17: number;
  readonly children18: number;
  readonly newImmigrant: boolean;
  readonly dischargedSoldier: boolean;
  readonly academicDegree: boolean;
}

export interface CreditPointLine {
  readonly label: string;
  readonly points: number;
}

export interface CreditPointsResult {
  readonly total: number;
  readonly breakdown: readonly CreditPointLine[];
  readonly note: string;
}

export function computeCreditPoints(taxYear: number, profile: CreditPointsProfile): CreditPointsResult {
  const cp = getTaxYearConfig(taxYear).creditPoints;
  const breakdown: CreditPointLine[] = [];

  breakdown.push({ label: "תושב/ת ישראל", points: cp.resident });
  if (profile.isWoman) breakdown.push({ label: "אישה", points: cp.womanExtra });
  if (profile.singleParent) breakdown.push({ label: "הורה במשפחה חד-הורית", points: cp.singleParent });

  const addChildren = (count: number, perChild: number, label: string): void => {
    if (count > 0) breakdown.push({ label: `${label} (×${count})`, points: count * perChild });
  };
  addChildren(profile.childrenBirthYear, cp.childBirthYear, "ילד/ה בשנת הלידה");
  addChildren(profile.children1to5, cp.child1to5, "ילד/ה בגיל 1–5");
  addChildren(profile.children6to17, cp.child6to17, "ילד/ה בגיל 6–17");
  addChildren(profile.children18, cp.child18, "ילד/ה בגיל 18");

  if (profile.newImmigrant) breakdown.push({ label: "עולה חדש (אומדן)", points: cp.newImmigrantEstimate });
  if (profile.dischargedSoldier) breakdown.push({ label: "חייל/ת משוחרר/ת (אומדן)", points: cp.dischargedSoldierEstimate });
  if (profile.academicDegree) breakdown.push({ label: "סיום תואר אקדמי (אומדן)", points: cp.academicDegreeEstimate });

  const total = breakdown.reduce((s, l) => s + l.points, 0);
  return { total, breakdown, note: cp.note };
}
