import { nanoid } from "nanoid/non-secure";
import type { Category } from "@/types/models";
import { DEFAULT_CATEGORIES } from "@/types/models";
import { createAsyncStore } from "./asyncStore";

const CATEGORIES_KEY = "@bills/categories";

export const categoriesStore = createAsyncStore<Category[]>({
  key: CATEGORIES_KEY,
  initial: [],
});

/** Sentence-case for labels: first letter uppercased, rest preserved exactly. */
function sentenceCase(s: string): string {
  const t = s.trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function seedDefaultCategoriesIfEmpty() {
  if (categoriesStore.getSnapshot().length === 0) {
    categoriesStore.replace([...DEFAULT_CATEGORIES]);
  }
}

export function createCategory(input: {
  label: string;
  emoji: string;
}): Category {
  const category: Category = {
    id: nanoid(8),
    label: sentenceCase(input.label),
    emoji: input.emoji,
    isDefault: false,
  };
  categoriesStore.set((prev) => [...prev, category]);
  return category;
}

export function updateCategory(
  id: string,
  patch: Partial<Pick<Category, "label" | "emoji" | "archivedAt">>,
) {
  const normalized: typeof patch =
    patch.label !== undefined
      ? { ...patch, label: sentenceCase(patch.label) }
      : patch;
  categoriesStore.set((prev) =>
    prev.map((c) => (c.id === id ? { ...c, ...normalized } : c)),
  );
}

export function archiveCategory(id: string) {
  updateCategory(id, { archivedAt: Date.now() });
}

export function unarchiveCategory(id: string) {
  categoriesStore.set((prev) =>
    prev.map((c) => {
      if (c.id !== id) return c;
      const next = { ...c };
      delete next.archivedAt;
      return next;
    }),
  );
}

export function deleteCategory(id: string) {
  categoriesStore.set((prev) => prev.filter((c) => c.id !== id));
}

export function resetCategoryToDefault(id: string) {
  const def = DEFAULT_CATEGORIES.find((c) => c.id === id);
  if (!def) return;
  categoriesStore.set((prev) =>
    prev.map((c) => {
      if (c.id !== id) return c;
      const next: Category = { ...c, label: def.label, emoji: def.emoji };
      delete next.archivedAt;
      return next;
    }),
  );
}
