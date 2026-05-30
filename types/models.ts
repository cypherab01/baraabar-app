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

export interface Person {
  id: string;
  name: string;
  createdAt: number;
}

export interface Category {
  id: string;
  label: string;
  emoji: string;
  isDefault: boolean;
  archivedAt?: number;
}

export interface AppSettings {
  themeMode: "system" | "light" | "dark";
}

export interface Member {
  id: string;
  name: string;
  personId?: string;
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
  categoryId: string;
  note?: string;
  createdAt: number;
  splitWith?: string[];
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "food", label: "Food", emoji: "🍽️", isDefault: true },
  { id: "transport", label: "Transport", emoji: "🚖", isDefault: true },
  { id: "stay", label: "Stay", emoji: "🏨", isDefault: true },
  { id: "ticket", label: "Ticket", emoji: "🎟️", isDefault: true },
];

export const LEGACY_CATEGORY_META: Record<
  string,
  { label: string; emoji: string }
> = {
  activities: { label: "Activities", emoji: "🎟️" },
  shopping: { label: "Shopping", emoji: "🛍️" },
  other: { label: "Other", emoji: "✨" },
};

export const DEFAULT_SETTINGS: AppSettings = { themeMode: "system" };
