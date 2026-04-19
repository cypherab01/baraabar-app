import AsyncStorage from "@react-native-async-storage/async-storage";
import { nanoid } from "nanoid/non-secure";
import type { Expense, Trip } from "@/types/models";
import { createAsyncStore } from "./asyncStore";

const TRIPS_KEY = "@bills/trips";
const expenseKey = (tripId: string) => `@bills/expenses:${tripId}`;

export const tripsStore = createAsyncStore<Trip[]>({
  key: TRIPS_KEY,
  initial: [],
});

const expenseStores = new Map<
  string,
  ReturnType<typeof createAsyncStore<Expense[]>>
>();

export function expensesStoreFor(tripId: string) {
  let store = expenseStores.get(tripId);
  if (!store) {
    store = createAsyncStore<Expense[]>({
      key: expenseKey(tripId),
      initial: [],
    });
    expenseStores.set(tripId, store);
  }
  return store;
}

export interface NewTripInput {
  name: string;
  currency: string;
  memberNames: string[];
}

export function createTrip(input: NewTripInput): Trip {
  const now = Date.now();
  const trip: Trip = {
    id: nanoid(10),
    name: input.name.trim(),
    currency: input.currency,
    members: input.memberNames
      .map((n) => n.trim())
      .filter(Boolean)
      .map((name) => ({ id: nanoid(8), name })),
    createdAt: now,
  };
  tripsStore.set((prev) => [trip, ...prev]);
  // Prime the expense store so subscribers get an empty array snapshot
  expensesStoreFor(trip.id);
  return trip;
}

export function updateTrip(id: string, patch: Partial<Omit<Trip, "id">>) {
  tripsStore.set((prev) =>
    prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
  );
}

export async function deleteTrip(id: string) {
  tripsStore.set((prev) => prev.filter((t) => t.id !== id));
  expenseStores.delete(id);
  try {
    await AsyncStorage.removeItem(expenseKey(id));
  } catch (err) {
    console.warn("[tripsStore] failed to remove expenses", err);
  }
}

export function closeTrip(id: string) {
  updateTrip(id, { closedAt: Date.now() });
}

export function reopenTrip(id: string) {
  updateTrip(id, { closedAt: undefined });
}

export interface NewExpenseInput {
  tripId: string;
  payerId: string;
  amount: number;
  category: Expense["category"];
  customCategoryLabel?: string;
  note?: string;
}

export function addExpense(input: NewExpenseInput): Expense {
  const expense: Expense = {
    id: nanoid(10),
    tripId: input.tripId,
    payerId: input.payerId,
    amount: input.amount,
    category: input.category,
    customCategoryLabel: input.customCategoryLabel?.trim() || undefined,
    note: input.note?.trim() || undefined,
    createdAt: Date.now(),
  };
  expensesStoreFor(input.tripId).set((prev) => [expense, ...prev]);
  return expense;
}

export function updateExpense(
  tripId: string,
  id: string,
  patch: Partial<Omit<Expense, "id" | "tripId" | "createdAt">>,
) {
  expensesStoreFor(tripId).set((prev) =>
    prev.map((e) => (e.id === id ? { ...e, ...patch } : e)),
  );
}

export function deleteExpense(tripId: string, id: string) {
  expensesStoreFor(tripId).set((prev) => prev.filter((e) => e.id !== id));
}
