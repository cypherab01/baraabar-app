import { nanoid } from "nanoid/non-secure";
import type { Person } from "@/types/models";
import { createAsyncStore } from "./asyncStore";
import { tripsStore } from "./tripsStore";

const PERSONS_KEY = "@bills/persons";

export const personsStore = createAsyncStore<Person[]>({
  key: PERSONS_KEY,
  initial: [],
});

export function createPerson(name: string): Person {
  const person: Person = {
    id: nanoid(10),
    name: name.trim(),
    createdAt: Date.now(),
  };
  personsStore.set((prev) => [person, ...prev]);
  return person;
}

export function renamePerson(id: string, name: string) {
  const next = name.trim();
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
