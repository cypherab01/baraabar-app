import { useMemo, useSyncExternalStore } from "react";
import { categoriesStore } from "@/storage/categoriesStore";
import type { Category } from "@/types/models";

export function useCategories(): Category[] {
  return useSyncExternalStore(
    categoriesStore.subscribe,
    categoriesStore.getSnapshot,
  );
}

export function useCategoriesById(): Map<string, Category> {
  const categories = useCategories();
  return useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );
}
