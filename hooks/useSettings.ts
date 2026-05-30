import { useSyncExternalStore } from "react";
import { settingsStore } from "@/storage/settingsStore";
import type { AppSettings } from "@/types/models";

export function useSettings(): AppSettings {
  return useSyncExternalStore(
    settingsStore.subscribe,
    settingsStore.getSnapshot,
  );
}
