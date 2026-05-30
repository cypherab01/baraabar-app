import { nanoid } from "nanoid/non-secure";
import type { Category, Expense, Member, Person, Trip } from "@/types/models";
import { LEGACY_CATEGORY_META } from "@/types/models";
import { createAsyncStore } from "./asyncStore";
import { categoriesStore } from "./categoriesStore";
import { personsStore } from "./personsStore";
import { expensesStoreFor, tripsStore } from "./tripsStore";

const MIGRATIONS_KEY = "@bills/migrations";
const V1_FLAG = "v1-persons-and-categories";

type MigrationsFlags = Record<string, true>;

export const migrationsStore = createAsyncStore<MigrationsFlags>({
  key: MIGRATIONS_KEY,
  initial: {},
});

interface LegacyExpense extends Expense {
  category?: string;
  customCategoryLabel?: string;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export async function runV1Migration(): Promise<void> {
  if (migrationsStore.getSnapshot()[V1_FLAG]) return;

  const trips = tripsStore.getSnapshot();

  // 1. Persons backfill
  const oldestByNormalized = new Map<
    string,
    { name: string; createdAt: number }
  >();
  for (const trip of trips) {
    for (const m of trip.members) {
      const key = normalizeName(m.name);
      if (!key) continue;
      const prev = oldestByNormalized.get(key);
      if (!prev || trip.createdAt < prev.createdAt) {
        oldestByNormalized.set(key, { name: m.name, createdAt: trip.createdAt });
      }
    }
  }

  const existingPersons = personsStore.getSnapshot();
  const personIdByNormalized = new Map<string, string>();
  for (const p of existingPersons) {
    personIdByNormalized.set(normalizeName(p.name), p.id);
  }

  const newPersons: Person[] = [];
  for (const [normalized, info] of oldestByNormalized) {
    if (personIdByNormalized.has(normalized)) continue;
    const id = nanoid(10);
    newPersons.push({ id, name: info.name, createdAt: info.createdAt });
    personIdByNormalized.set(normalized, id);
  }
  if (newPersons.length > 0) {
    personsStore.set((prev) => [...newPersons, ...prev]);
  }

  // 2. Link Member.personId
  if (trips.length > 0) {
    tripsStore.set((prev) =>
      prev.map((trip) => ({
        ...trip,
        members: trip.members.map((m): Member => {
          if (m.personId) return m;
          const personId = personIdByNormalized.get(normalizeName(m.name));
          return personId ? { ...m, personId } : m;
        }),
      })),
    );
  }

  // 3. Categories backfill — walk every trip's expenses
  const existingCategories = categoriesStore.getSnapshot();
  const categoryById = new Map(existingCategories.map((c) => [c.id, c]));
  const newCategories: Category[] = [];

  for (const trip of trips) {
    const store = expensesStoreFor(trip.id);
    await store.ready;
    const expenses = store.getSnapshot() as LegacyExpense[];

    const rewritten: Expense[] = expenses.map((e) => {
      const legacyKey = e.category ?? e.categoryId;
      let categoryId: string;

      if (e.customCategoryLabel) {
        const label = e.customCategoryLabel.trim() || "Other";
        const labelKey = label.toLowerCase();
        let existing: Category | undefined;
        for (const cat of categoryById.values()) {
          if (cat.label.toLowerCase() === labelKey) {
            existing = cat;
            break;
          }
        }
        if (existing) {
          categoryId = existing.id;
        } else {
          const id = nanoid(8);
          const cat: Category = {
            id,
            label,
            emoji: "✨",
            isDefault: false,
          };
          newCategories.push(cat);
          categoryById.set(id, cat);
          categoryId = id;
        }
      } else if (legacyKey && !categoryById.has(legacyKey)) {
        const meta =
          LEGACY_CATEGORY_META[legacyKey] ??
          { label: legacyKey, emoji: "✨" };
        const cat: Category = {
          id: legacyKey,
          label: meta.label,
          emoji: meta.emoji,
          isDefault: false,
        };
        newCategories.push(cat);
        categoryById.set(legacyKey, cat);
        categoryId = legacyKey;
      } else {
        categoryId = legacyKey ?? "food";
      }

      return {
        id: e.id,
        tripId: e.tripId,
        payerId: e.payerId,
        amount: e.amount,
        categoryId,
        note: e.note,
        createdAt: e.createdAt,
        splitWith: e.splitWith,
      };
    });

    store.replace(rewritten);
  }

  if (newCategories.length > 0) {
    categoriesStore.set((prev) => [...prev, ...newCategories]);
  }

  // 4. Set flag
  migrationsStore.set((prev) => ({ ...prev, [V1_FLAG]: true }));
}

// Used by the JSON backup importer after a Replace operation: the imported
// data is already in post-migration shape, so re-setting the flag avoids
// a no-op re-run on next launch.
export function preserveV1MigrationFlag() {
  migrationsStore.set((prev) => ({ ...prev, [V1_FLAG]: true }));
}
