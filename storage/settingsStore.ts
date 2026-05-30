import type { AppSettings } from "@/types/models";
import { DEFAULT_SETTINGS } from "@/types/models";
import { createAsyncStore } from "./asyncStore";

const SETTINGS_KEY = "@bills/settings";

export const settingsStore = createAsyncStore<AppSettings>({
  key: SETTINGS_KEY,
  initial: DEFAULT_SETTINGS,
});

export function setThemeMode(mode: AppSettings["themeMode"]) {
  settingsStore.set((prev) => ({ ...prev, themeMode: mode }));
}
