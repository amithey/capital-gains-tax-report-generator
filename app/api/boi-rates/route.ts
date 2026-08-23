import { NextResponse } from "next/server";
import { boiSeriesCode, parseBoiCsv } from "@/rates/boi-csv";

/**
 * Proxy stateless לשערי בנק ישראל (Fusion Edge / SDMX).
 *
 * מדוע proxy: ה-API של בנק ישראל אינו מאפשר CORS מהדפדפן. ה-route הזה רץ בצד
 * השרת (Vercel), מושך את ה-CSV הציבורי, וממיר ל-JSON. הוא אינו שומר ואינו
 * מתעד נתוני משתמש — שערי חליפין הם מידע ציבורי, לא מידע פיננסי של המשתמש.
 *
 * GET /api/boi-rates?currency=USD&start=2024-01-01&end=2024-12-31
 */

const BOI_BASE =
  "https://edge.boi.org.il/FusionEdgeServer/sdmx/v2/data/dataflow/BOI.STATISTICS/EXR/1.0";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const currency = searchParams.get("currency")?.toUpperCase() ?? "";
  const start = searchParams.get("start") ?? "";
  const end = searchParams.get("end") ?? "";

  if (!/^[A-Z]{3}$/.test(currency)) {
    return NextResponse.json({ error: "פרמטר currency חסר או לא תקין." }, { status: 400 });
  }
  if (!DATE_RE.test(start) || !DATE_RE.test(end)) {
    return NextResponse.json({ error: "פרמטרי start/end חסרים או לא בפורמט YYYY-MM-DD." }, { status: 400 });
  }

  const url =
    `${BOI_BASE}/${boiSeriesCode(currency)}` +
    `?format=csv&startperiod=${start}&endperiod=${end}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "text/csv" },
      // cache בצד Vercel ל-24 שעות — שערים היסטוריים אינם משתנים.
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `בנק ישראל החזיר שגיאה (${res.status}).` },
        { status: 502 },
      );
    }
    const csv = await res.text();
    const observations = parseBoiCsv(csv);
    return NextResponse.json({ currency, observations });
  } catch {
    return NextResponse.json(
      { error: "כשל בפנייה לשרת בנק ישראל. ניתן להעלות שערים ידנית כחלופה." },
      { status: 502 },
    );
  }
}
