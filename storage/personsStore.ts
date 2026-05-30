import { nanoid } from "nanoid/non-secure";
import type { Person } from "@/types/models";
import { createAsyncStore } from "./asyncStore";
import { tripsStore } from "./tripsStore";

const PERSONS_KEY = "@bills/persons";

export const personsStore = createAsyncStore<Person[]>({
  key: PERSONS_KEY,
  initial: [],
});

/** Title-case for names: capitalize the first letter of every whitespace-split word; preserve interior case the user typed. */
function capitalizeWords(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function createPerson(name: string): Person {
  const person: Person = {
    id: nanoid(10),
    name: capitalizeWords(name),
    createdAt: Date.now(),
  };
  personsStore.set((prev) => [person, ...prev]);
  return person;
}

/**
 * Resolve a Person for `name`, creating one if no case-insensitive match exists.
 * Use this when an in-app flow takes a free-text name and needs to make sure
 * that person is reflected in the global directory (e.g., adding a member to
 * an existing trip). If a matching Person is archived, they're un-archived —
 * the user is clearly engaging with them again.
 */
export function findOrCreatePerson(name: string): Person {
  const trimmed = name.trim();
  if (!trimmed) {
    // Caller is expected to validate non-empty first; defensive fallback.
    return createPerson(trimmed);
  }
  const key = trimmed.toLowerCase();
  const existing = personsStore
    .getSnapshot()
    .find((p) => p.name.trim().toLowerCase() === key);
  if (existing) {
    if (existing.archivedAt) {
      setPersonArchived(existing.id, false);
      return { ...existing, archivedAt: undefined };
    }
    return existing;
  }
  return createPerson(trimmed);
}

export function setPersonArchived(id: string, archived: boolean) {
  personsStore.set((prev) =>
    prev.map((p) => {
      if (p.id !== id) return p;
      if (archived) return { ...p, archivedAt: Date.now() };
      const next = { ...p };
      delete next.archivedAt;
      return next;
    }),
  );
}

export function renamePerson(id: string, name: string) {
  const next = capitalizeWords(name);
  if (!next) return;
  personsStore.set((prev) =>
    prev.map((p) => (p.id === id ? { ...p, name: next } : p)),
  );
  // Cascade the new name into every trip-Member linked to this Person, so
  // renaming a friend updates them everywhere they appear — trip rosters,
  // expense rows, settlement summary, etc. All those screens read Member.name.
  tripsStore.set((prev) =>
    prev.map((t) => ({
      ...t,
      members: t.members.map((m) =>
        m.personId === id ? { ...m, name: next } : m,
      ),
    })),
  );
}

export function deletePerson(id: string) {
  personsStore.set((prev) => prev.filter((p) => p.id !== id));
}
