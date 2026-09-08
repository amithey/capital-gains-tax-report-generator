import { XMLParser } from "fast-xml-parser";
import type {
  IsoDate,
  ParsedActivity,
  RawDividend,
  RawTrade,
  RawWithholding,
  TradeSide,
} from "./types";

/**
 * Parser ל-IBKR Flex Query XML.
 *
 * סובלני בכוונה: שורות שאינן עסקאות/דיבידנדים/ניכוי-מס מדולגות עם אזהרה במקום
 * להפיל את ה-parse. שדות חסרים בשורה בודדת מדלגים על אותה שורה בלבד.
 *
 * מוסכמות הסימנים של IBKR מנורמלות כאן למבנה הנקי:
 *   - quantity/proceeds/commission נשמרים כערכים חיוביים; כיוון נקבע ב-side.
 *   - Withholding Tax מגיע כסכום שלילי ומנורמל לחיובי.
 */

const TRADE_ATTRS = [
  "buySell",
  "symbol",
  "tradeDate",
  "quantity",
  "tradePrice",
  "proceeds",
  "currency",
] as const;

interface FlexXmlOptions {
  /** מנגנון איסוף אזהרות; מוזרק כדי שה-API החיצוני יחזיר אותן למשתמש. */
  readonly warn: (message: string) => void;
}

/** ממיר מחרוזת מספרית של IBKR ל-number. מחזיר null אם לא ניתן לפרסר. */
function parseNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  // IBKR עשוי לכלול פסיקים כמפרידי אלפים בתצורות מסוימות.
  const cleaned = String(value).replace(/,/g, "").trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/**
 * מנרמל תאריך מ-IBKR ל-ISO (YYYY-MM-DD).
 * תומך ב: "YYYYMMDD", "YYYY-MM-DD", ובפורמט dateTime עם הפרדה ";" או רווח.
 * מחזיר null אם לא מזוהה.
 */
function normalizeDate(value: unknown): IsoDate | null {
  if (value === undefined || value === null) return null;
  const raw = String(value).trim();
  if (raw === "") return null;
  // קח רק את חלק התאריך (לפני ";" או רווח של dateTime).
  const datePart = raw.split(/[;\s]/)[0] ?? "";
  const isoMatch = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return datePart;
  const compactMatch = datePart.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compactMatch) {
    return `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}`;
  }
  return null;
}

/** מוודא שערך הוא מערך — fast-xml-parser מחזיר אובייקט בודד כשיש פריט אחד. */
function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function getString(record: Record<string, unknown>, key: string): string | undefined {
  const v = record[key];
  return v === undefined || v === null ? undefined : String(v);
}

function parseTrade(
  record: Record<string, unknown>,
  opts: FlexXmlOptions,
): RawTrade | null {
  const missing = TRADE_ATTRS.filter((a) => record[a] === undefined || record[a] === "");
  if (missing.length > 0) {
    opts.warn(`שורת עסקה דולגה — חסרים שדות: ${missing.join(", ")}`);
    return null;
  }

  const sideRaw = getString(record, "buySell")?.toUpperCase();
  const side: TradeSide | null =
    sideRaw === "BUY" ? "BUY" : sideRaw === "SELL" ? "SELL" : null;
  if (side === null) {
    opts.warn(`שורת עסקה דולגה — ערך buySell לא מזוהה: "${sideRaw}"`);
    return null;
  }

  const date = normalizeDate(record["tradeDate"]);
  const quantity = parseNumber(record["quantity"]);
  const price = parseNumber(record["tradePrice"]);
  const proceeds = parseNumber(record["proceeds"]);
  if (date === null || quantity === null || price === null || proceeds === null) {
    opts.warn(`שורת עסקה דולגה — שדה מספרי/תאריך לא תקין (symbol=${getString(record, "symbol") ?? "?"})`);
    return null;
  }

  const commission = parseNumber(record["ibCommission"]) ?? 0;

  return {
    side,
    symbol: getString(record, "symbol") ?? "",
    date,
    quantity: Math.abs(quantity),
    price: Math.abs(price),
    proceeds: Math.abs(proceeds),
    commission: Math.abs(commission),
    currency: getString(record, "currency") ?? "",
    ...optional("sourceId", getString(record, "transactionID")),
    ...optional("description", getString(record, "description")),
    ...optional("assetCategory", getString(record, "assetCategory")),
  };
}

/** עוזר ל-exactOptionalPropertyTypes: מוסיף מפתח רק אם הערך קיים. */
function optional<K extends string, V>(
  key: K,
  value: V | undefined,
): Record<K, V> | Record<string, never> {
  return value === undefined ? {} : ({ [key]: value } as Record<K, V>);
}

interface CashResult {
  readonly dividends: RawDividend[];
  readonly withholdings: RawWithholding[];
}

function parseCashTransactions(
  records: Record<string, unknown>[],
  opts: FlexXmlOptions,
): CashResult {
  const dividends: RawDividend[] = [];
  const withholdings: RawWithholding[] = [];

  for (const record of records) {
    const type = getString(record, "type") ?? "";
    const date = normalizeDate(record["dateTime"] ?? record["settleDate"] ?? record["reportDate"]);
    const amount = parseNumber(record["amount"]);
    const currency = getString(record, "currency") ?? "";
    const symbol = getString(record, "symbol") ?? "";

    if (type === "Dividends" || type === "Payment In Lieu Of Dividends") {
      if (date === null || amount === null) {
        opts.warn(`שורת דיבידנד דולגה — שדה לא תקין (symbol=${symbol || "?"})`);
        continue;
      }
      dividends.push({
        symbol,
        date,
        grossAmount: Math.abs(amount),
        currency,
        ...optional("sourceId", getString(record, "transactionID")),
        ...optional("description", getString(record, "description")),
      });
    } else if (type === "Withholding Tax") {
      if (date === null || amount === null) {
        opts.warn(`שורת ניכוי מס במקור דולגה — שדה לא תקין (symbol=${symbol || "?"})`);
        continue;
      }
      withholdings.push({
        symbol,
        date,
        amount: Math.abs(amount),
        currency,
        ...optional("sourceId", getString(record, "transactionID")),
        ...optional("description", getString(record, "description")),
      });
    } else {
      // סוגים אחרים (ריבית, עמלות חשבון וכו') אינם רלוונטיים לחישוב ב-MVP.
      opts.warn(`שורת מזומן מסוג "${type}" דולגה (אינה דיבידנד/ניכוי מס).`);
    }
  }

  return { dividends, withholdings };
}

/**
 * מקבל את תוכן ה-XML כמחרוזת ומחזיר ParsedActivity.
 * זורק שגיאה רק אם המבנה אינו Flex Query כלל (לזיהוי פורמט ראה detect.ts).
 */
export function parseFlexQueryXml(xml: string): ParsedActivity {
  // Flex reports do not need DTDs. Reject them before parsing to prevent custom entity expansion.
  if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(xml)) {
    throw new Error("דוח XML עם הגדרות DOCTYPE או ENTITY אינו נתמך מטעמי אבטחה. יש לייצא Flex Query רגיל מ-IBKR.");
  }
  const warnings: string[] = [];
  const warn = (m: string): void => {
    warnings.push(m);
  };

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    parseAttributeValue: false,
    trimValues: true,
  });

  const doc = parser.parse(xml) as Record<string, unknown>;
  const response = doc["FlexQueryResponse"] as Record<string, unknown> | undefined;
  if (response === undefined) {
    throw new Error(
      "הקובץ אינו דוח Flex Query של IBKR — לא נמצא אלמנט FlexQueryResponse.",
    );
  }

  const statementsContainer = response["FlexStatements"] as Record<string, unknown> | undefined;
  const statements = toArray(statementsContainer?.["FlexStatement"]) as Record<string, unknown>[];
  if (statements.length === 0) {
    throw new Error("דוח ה-Flex Query אינו מכיל FlexStatement.");
  }

  const trades: RawTrade[] = [];
  const dividends: RawDividend[] = [];
  const withholdings: RawWithholding[] = [];
  const accountCurrencies = new Set<string>();

  for (const statement of statements) {
    const accountInfo = statement["AccountInformation"] as Record<string, unknown> | undefined;
    const baseCurrency = accountInfo ? getString(accountInfo, "currency") : undefined;
    if (baseCurrency) accountCurrencies.add(baseCurrency);

    const tradesContainer = statement["Trades"] as Record<string, unknown> | undefined;
    const tradeRecords = toArray(tradesContainer?.["Trade"]) as Record<string, unknown>[];
    for (const record of tradeRecords) {
      const trade = parseTrade(record, { warn });
      if (trade !== null) trades.push(trade);
    }

    const cashContainer = statement["CashTransactions"] as Record<string, unknown> | undefined;
    const cashRecords = toArray(cashContainer?.["CashTransaction"]) as Record<string, unknown>[];
    const cash = parseCashTransactions(cashRecords, { warn });
    dividends.push(...cash.dividends);
    withholdings.push(...cash.withholdings);
  }

  if (trades.length === 0 && dividends.length === 0 && withholdings.length === 0) {
    warn("לא נמצאו עסקאות, דיבידנדים או ניכויי מס בדוח. ודא שה-Flex Query כולל את הסקשנים Trades ו-CashTransactions.");
  }

  return {
    trades,
    dividends,
    withholdings,
    accountCurrencies: [...accountCurrencies],
    warnings,
  };
}
