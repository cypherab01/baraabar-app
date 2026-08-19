import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  expensesStoreFor,
  tripsStore,
} from "@/storage/tripsStore";
import type { Expense, Trip } from "@/types/models";

/**
 * Shared frozen snapshot for "no trip id yet". `useSyncExternalStore` compares
 * snapshots with `Object.is`, so returning a fresh `[]` here would report a
 * store change on every render and loop until React bails with
 * "Maximum update depth exceeded".
 */
const NO_EXPENSES: Expense[] = [];
const NO_SUBSCRIPTION = () => () => {};

export function useTrips(): Trip[] {
  return useSyncExternalStore(tripsStore.subscribe, tripsStore.getSnapshot);
}

export function useTrip(id: string | undefined): Trip | undefined {
  const trips = useTrips();
  if (!id) return undefined;
  return trips.find((t) => t.id === id);
}

export function useExpenses(tripId: string | undefined): Expense[] {
  const store = useMemo(
    () => (tripId ? expensesStoreFor(tripId) : null),
    [tripId],
  );
  const subscribe = useMemo(
    () => (store ? store.subscribe : NO_SUBSCRIPTION),
    [store],
  );
  const getSnapshot = useCallback(
    () => (store ? store.getSnapshot() : NO_EXPENSES),
    [store],
  );
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function useExpense(
  tripId: string | undefined,
  expenseId: string | undefined,
): Expense | undefined {
  const expenses = useExpenses(tripId);
  if (!expenseId) return undefined;
  return expenses.find((e) => e.id === expenseId);
}
