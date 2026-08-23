import type { RawTrade } from "@/parsers";
import type { RateTable } from "@/rates";
import { resolveRate } from "@/rates";
import { matchLots, type OpenLot } from "./lot-matching";
import type { CapitalGainsResult, DisposalLine, LotMatchingMethod } from "./types";

/**
 * מנוע רווחי/הפסדי הון.
 *
 * עקרונות החישוב (מתועדים, טעונים אימות רו"ח):
 * 1. כל רגל מומרת לשקל בשער היציג של *תאריכה שלה* בנפרד — בסיס העלות בשער יום
 *    הרכישה, התמורה בשער יום המכירה. כך נלכד גם רווח/הפסד שמקורו בשער החליפין.
 * 2. עמלות מגולגלות: עמלת קנייה מתווספת לבסיס העלות; עמלת מכירה מנוכה מהתמורה —
 *    שתיהן לפני ההמרה לשקל, במטבע המקור.
 * 3. התאמת מכירות לקניות לפי FIFO (ניתן להחלפה דרך options.method).
 * 4. רווח/הפסד = תמורה בשקל − בסיס עלות בשקל, לכל התאמה (מכירה×lot).
 */

export interface CapitalGainsOptions {
  readonly method?: LotMatchingMethod;
}

interface GroupState {
  readonly symbol: string;
  readonly currency: string;
  readonly lots: OpenLot[];
}

function groupKey(trade: RawTrade): string {
  return `${trade.symbol}|${trade.currency}`;
}

/** מיון כרונולוגי; באותו יום — קנייה לפני מכירה (כדי שיהיו lots להתאמה). */
function chronological(a: RawTrade, b: RawTrade): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  if (a.side === b.side) return 0;
  return a.side === "BUY" ? -1 : 1;
}

export function computeCapitalGains(
  trades: readonly RawTrade[],
  rates: RateTable,
  options: CapitalGainsOptions = {},
): CapitalGainsResult {
  const method: LotMatchingMethod = options.method ?? "FIFO";
  const warnings: string[] = [];
  const lines: DisposalLine[] = [];

  // קיבוץ לפי נייר+מטבע, ומיון כרונולוגי בתוך כל קבוצה.
  const grouped = new Map<string, RawTrade[]>();
  for (const trade of trades) {
    const key = groupKey(trade);
    const list = grouped.get(key);
    if (list === undefined) grouped.set(key, [trade]);
    else list.push(trade);
  }

  for (const groupTrades of grouped.values()) {
    const sorted = [...groupTrades].sort(chronological);
    const first = sorted[0]!;
    const state: GroupState = { symbol: first.symbol, currency: first.currency, lots: [] };

    for (const trade of sorted) {
      if (trade.side === "BUY") {
        const buyRate = resolveRate(rates, trade.currency, trade.date);
        // עלות כוללת במטבע = תמורה ברוטו + עמלה; מומרת לשקל בשער יום הרכישה.
        const costCur = trade.proceeds + trade.commission;
        const costIls = costCur * buyRate.rate;
        const costPerUnit = costIls / trade.quantity;
        state.lots.push({
          acquisitionDate: trade.date,
          quantity: trade.quantity,
          costPerUnit,
          acquisitionRate: buyRate.rate,
          acquisitionRateDate: buyRate.usedDate,
        });
        if (buyRate.fellBack) {
          warnings.push(
            `שער יום הרכישה ל-${trade.symbol} בתאריך ${trade.date} לא פורסם; נעשה שימוש בשער מ-${buyRate.usedDate}.`,
          );
        }
      } else {
        const sellRate = resolveRate(rates, trade.currency, trade.date);
        // תמורה נטו במטבע = תמורה ברוטו − עמלה; מומרת לשקל בשער יום המכירה.
        const netProceedsCur = trade.proceeds - trade.commission;
        const proceedsIlsPerUnit = (netProceedsCur * sellRate.rate) / trade.quantity;

        const { chunks, unmatchedQuantity } = matchLots(state.lots, trade.quantity, method);
        if (unmatchedQuantity > 0) {
          warnings.push(
            `מכירת ${trade.symbol} בתאריך ${trade.date}: ${unmatchedQuantity} יחידות ללא קנייה תואמת (חוסר נתונים?) — לא חושב עבורן רווח/הפסד.`,
          );
        }
        if (sellRate.fellBack) {
          warnings.push(
            `שער יום המכירה ל-${trade.symbol} בתאריך ${trade.date} לא פורסם; נעשה שימוש בשער מ-${sellRate.usedDate}.`,
          );
        }

        for (const chunk of chunks) {
          const costBasisIls = chunk.costPerUnit * chunk.quantity;
          const proceedsIls = proceedsIlsPerUnit * chunk.quantity;
          lines.push({
            symbol: state.symbol,
            currency: state.currency,
            acquisitionDate: chunk.acquisitionDate,
            saleDate: trade.date,
            quantity: chunk.quantity,
            costBasisIls,
            proceedsIls,
            gainIls: proceedsIls - costBasisIls,
            acquisitionRate: chunk.acquisitionRate,
            acquisitionRateDate: chunk.acquisitionRateDate,
            saleRate: sellRate.rate,
            saleRateDate: sellRate.usedDate,
          });
        }
      }
    }
  }

  // צבירה
  let totalProceedsIls = 0;
  let totalCostBasisIls = 0;
  let totalGainsIls = 0;
  let totalLossesIls = 0;
  for (const line of lines) {
    totalProceedsIls += line.proceedsIls;
    totalCostBasisIls += line.costBasisIls;
    if (line.gainIls >= 0) totalGainsIls += line.gainIls;
    else totalLossesIls += -line.gainIls;
  }

  return {
    lines,
    totalProceedsIls,
    totalCostBasisIls,
    netGainIls: totalGainsIls - totalLossesIls,
    totalGainsIls,
    totalLossesIls,
    warnings,
  };
}
