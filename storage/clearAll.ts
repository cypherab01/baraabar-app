import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_SETTINGS } from "@/types/models";
import {
  categoriesStore,
  seedDefaultCategoriesIfEmpty,
} from "./categoriesStore";
import { migrationsStore } from "./migrations";
import { personsStore } from "./personsStore";
import { settingsStore } from "./settingsStore";
import { resetExpenseStores, tripsStore } from "./tripsStore";

const BILLS_PREFIX = "@bills/";

export async function clearAllData(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const targets = keys.filter((k) => k.startsWith(BILLS_PREFIX));
  if (targets.length > 0) {
    await AsyncStorage.multiRemove(targets);
  }
  tripsStore.replace([]);
  resetExpenseStores();
  personsStore.replace([]);
  categoriesStore.replace([]);
  settingsStore.replace(DEFAULT_SETTINGS);
  migrationsStore.replace({});
  seedDefaultCategoriesIfEmpty();
}
