export type CurrencyCode = string;

export interface CurrencyOption {
  code: CurrencyCode;
  symbol: string;
  label: string;
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: "NPR", symbol: "Rs", label: "Nepalese Rupee" },
  { code: "INR", symbol: "₹", label: "Indian Rupee" },
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "JPY", symbol: "¥", label: "Japanese Yen" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar" },
  { code: "CAD", symbol: "C$", label: "Canadian Dollar" },
];

export type CategoryKey =
  | "food"
  | "transport"
  | "stay"
  | "activities"
  | "shopping"
  | "other";

export interface CategoryMeta {
  key: CategoryKey;
  label: string;
  emoji: string;
}

export const CATEGORIES: CategoryMeta[] = [
  { key: "food", label: "Food", emoji: "🍽️" },
  { key: "transport", label: "Transport", emoji: "🚖" },
  { key: "stay", label: "Stay", emoji: "🏨" },
  { key: "activities", label: "Activities", emoji: "🎟️" },
  { key: "shopping", label: "Shopping", emoji: "🛍️" },
  { key: "other", label: "Other", emoji: "✨" },
];

export interface Member {
  id: string;
  name: string;
}

export interface Trip {
  id: string;
  name: string;
  currency: CurrencyCode;
  members: Member[];
  createdAt: number;
  closedAt?: number;
}

export interface Expense {
  id: string;
  tripId: string;
  payerId: string;
  amount: number;
  category: CategoryKey;
  customCategoryLabel?: string;
  note?: string;
  createdAt: number;
}
