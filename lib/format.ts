import { CURRENCY_OPTIONS, type CurrencyCode } from "@/types/models";

const BASE_CURRENCY_SYMBOLS: Record<string, string> = CURRENCY_OPTIONS.reduce(
  (acc, option) => {
    acc[option.code] = option.symbol;
    return acc;
  },
  {} as Record<string, string>,
);

export function currencySymbol(code: CurrencyCode): string {
  if (BASE_CURRENCY_SYMBOLS[code]) return BASE_CURRENCY_SYMBOLS[code];
  return code;
}

export function formatAmount(amount: number, code: CurrencyCode): string {
  const symbol = currencySymbol(code);
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  const fractionDigits = Number.isInteger(abs) ? 0 : 2;
  const formatted = abs.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: 2,
  });
  return `${sign}${symbol} ${formatted}`;
}

export function formatAmountCompact(
  amount: number,
  code: CurrencyCode,
): string {
  const symbol = currencySymbol(code);
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  if (abs >= 100000) {
    return `${sign}${symbol} ${(abs / 1000).toFixed(1)}k`;
  }
  const fractionDigits = Number.isInteger(abs) ? 0 : 2;
  const formatted = abs.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: 2,
  });
  return `${sign}${symbol} ${formatted}`;
}

export function formatRelativeDate(ts: number): string {
  const now = Date.now();
  const diffMs = now - ts;
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay === 1) return "yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

export function formatDayLabel(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: d.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

export function initialsOf(name: string): string {
  const clean = name.trim();
  if (!clean) return "?";
  const parts = clean.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]!.toUpperCase()).join("");
}
