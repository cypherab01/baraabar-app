import { useEffect, useState } from "react";
import { expensesStoreFor } from "@/storage/tripsStore";
import type { Expense, Trip } from "@/types/models";

export function useAllExpenses(trips: Trip[]): Record<string, Expense[]> {
  const [snapshot, setSnapshot] = useState<Record<string, Expense[]>>(() => {
    const initial: Record<string, Expense[]> = {};
    for (const t of trips) {
      initial[t.id] = expensesStoreFor(t.id).getSnapshot();
    }
    return initial;
  });

  useEffect(() => {
    const update = () => {
      const next: Record<string, Expense[]> = {};
      for (const t of trips) {
        next[t.id] = expensesStoreFor(t.id).getSnapshot();
      }
      setSnapshot(next);
    };
    update();
    const unsubs = trips.map((t) => expensesStoreFor(t.id).subscribe(update));
    return () => {
      for (const u of unsubs) u();
    };
  }, [trips]);

  return snapshot;
}
