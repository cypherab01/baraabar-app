import AsyncStorage from "@react-native-async-storage/async-storage";
import { nanoid } from "nanoid/non-secure";
import type { Expense, Member, Trip } from "@/types/models";
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

export interface NewTripMemberInput {
  personId?: string;
  name: string;
}

export interface NewTripInput {
  name: string;
  currency: string;
  members: NewTripMemberInput[];
}

export function createTrip(input: NewTripInput): Trip {
  const now = Date.now();
  const trip: Trip = {
    id: nanoid(10),
    name: input.name.trim(),
    currency: input.currency,
    members: input.members
      .map((m) => ({ ...m, name: m.name.trim() }))
      .filter((m) => m.name.length > 0)
      .map(
        (m): Member => ({
          id: nanoid(8),
          name: m.name,
          ...(m.personId ? { personId: m.personId } : {}),
        }),
      ),
    createdAt: now,
  };
  tripsStore.set((prev) => [trip, ...prev]);
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

export function addMember(tripId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  tripsStore.set((prev) =>
    prev.map((t) =>
      t.id === tripId
        ? {
            ...t,
            members: [...t.members, { id: nanoid(8), name: trimmed }],
          }
        : t,
    ),
  );
}

export function renameMember(tripId: string, memberId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  tripsStore.set((prev) =>
    prev.map((t) =>
      t.id === tripId
        ? {
            ...t,
            members: t.members.map((m) =>
              m.id === memberId ? { ...m, name: trimmed } : m,
            ),
          }
        : t,
    ),
  );
}

export function resetExpenseStores(): void {
  for (const store of expenseStores.values()) {
    store.replace([]);
  }
  expenseStores.clear();
}

export { clearAllData } from "./clearAll";

export function removeMember(tripId: string, memberId: string): boolean {
  const trip = tripsStore.getSnapshot().find((t) => t.id === tripId);
  if (!trip) return false;
  if (trip.members.length <= 2) return false;
  const expensesStore = expensesStoreFor(tripId);
  const expenses = expensesStore.getSnapshot();
  if (expenses.some((e) => e.payerId === memberId)) return false;

  tripsStore.set((prev) =>
    prev.map((t) =>
      t.id === tripId
        ? { ...t, members: t.members.filter((m) => m.id !== memberId) }
        : t,
    ),
  );

  expensesStore.set((prev) =>
    prev.map((e) => {
      if (!e.splitWith) return e;
      const next = e.splitWith.filter((id) => id !== memberId);
      if (next.length === e.splitWith.length) return e;
      if (next.length === 0) {
        const { splitWith: _omit, ...rest } = e;
        return rest;
      }
      return { ...e, splitWith: next };
    }),
  );

  return true;
}

export interface NewExpenseInput {
  tripId: string;
  payerId: string;
  amount: number;
  categoryId: string;
  note?: string;
  splitWith?: string[];
}

export function addExpense(input: NewExpenseInput): Expense {
  const expense: Expense = {
    id: nanoid(10),
    tripId: input.tripId,
    payerId: input.payerId,
    amount: input.amount,
    categoryId: input.categoryId,
    note: input.note?.trim() || undefined,
    createdAt: Date.now(),
    splitWith:
      input.splitWith && input.splitWith.length > 0
        ? input.splitWith
        : undefined,
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
