import { useSyncExternalStore } from "react";
import { personsStore } from "@/storage/personsStore";
import type { Person } from "@/types/models";

export function usePersons(): Person[] {
  return useSyncExternalStore(
    personsStore.subscribe,
    personsStore.getSnapshot,
  );
}
