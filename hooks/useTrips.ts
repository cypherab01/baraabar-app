import { useSyncExternalStore } from "react";
import {
  expensesStoreFor,
  tripsStore,
} from "@/storage/tripsStore";
import type { Expense, Trip } from "@/types/models";

export function useTrips(): Trip[] {
  return useSyncExternalStore(tripsStore.subscribe, tripsStore.getSnapshot);
}

export function useTrip(id: string | undefined): Trip | undefined {
  const trips = useTrips();
  if (!id) return undefined;
  return trips.find((t) => t.id === id);
}

export function useExpenses(tripId: string | undefined): Expense[] {
  const store = tripId ? expensesStoreFor(tripId) : null;
  return useSyncExternalStore(
    (cb) => (store ? store.subscribe(cb) : () => {}),
    () => (store ? store.getSnapshot() : []),
  );
}

export function useExpense(
  tripId: string | undefined,
  expenseId: string | undefined,
): Expense | undefined {
  const expenses = useExpenses(tripId);
  if (!expenseId) return undefined;
  return expenses.find((e) => e.id === expenseId);
}
