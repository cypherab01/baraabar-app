import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { categoriesStore } from "@/storage/categoriesStore";
import { preserveV1MigrationFlag } from "@/storage/migrations";
import { personsStore } from "@/storage/personsStore";
import { settingsStore } from "@/storage/settingsStore";
import {
  clearAllData,
  expensesStoreFor,
  tripsStore,
} from "@/storage/tripsStore";
import type {
  AppSettings,
  Category,
  Expense,
  Person,
  Trip,
} from "@/types/models";

export interface BackupV1 {
  app: "baraabar";
  schemaVersion: 1;
  exportedAt: number;
  trips: Trip[];
  expenses: Record<string, Expense[]>;
  persons: Person[];
  categories: Category[];
  settings: AppSettings;
}

function todayStamp(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function buildBackup(): Promise<BackupV1> {
  const trips = tripsStore.getSnapshot();
  const expenses: Record<string, Expense[]> = {};
  for (const t of trips) {
    const store = expensesStoreFor(t.id);
    await store.ready;
    expenses[t.id] = store.getSnapshot();
  }
  return {
    app: "baraabar",
    schemaVersion: 1,
    exportedAt: Date.now(),
    trips,
    expenses,
    persons: personsStore.getSnapshot(),
    categories: categoriesStore.getSnapshot(),
    settings: settingsStore.getSnapshot(),
  };
}

export async function exportToFile(): Promise<void> {
  const data = await buildBackup();
  const json = JSON.stringify(data, null, 2);
  const uri = `${FileSystem.cacheDirectory}baraabar-backup-${todayStamp()}.json`;
  await FileSystem.writeAsStringAsync(uri, json, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing isn't available on this device.");
  }
  await Sharing.shareAsync(uri, {
    mimeType: "application/json",
    dialogTitle: "Baraabar backup",
  });
}

export class BackupError extends Error {}

export class BackupCancelledError extends BackupError {
  constructor() {
    super("Import canceled.");
    this.name = "BackupCancelledError";
  }
}

export async function pickAndReadBackup(): Promise<BackupV1> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "*/*"],
    copyToCacheDirectory: true,
  });
  if (result.canceled) throw new BackupCancelledError();
  const file = result.assets?.[0];
  if (!file) throw new BackupError("No file selected.");
  let raw: string;
  try {
    raw = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  } catch {
    throw new BackupError("Couldn't read that file.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new BackupError("This file isn't valid JSON.");
  }
  return validateBackup(parsed);
}

function validateBackup(data: unknown): BackupV1 {
  if (
    typeof data !== "object" ||
    data === null ||
    (data as { app?: unknown }).app !== "baraabar" ||
    (data as { schemaVersion?: unknown }).schemaVersion !== 1 ||
    !Array.isArray((data as { trips?: unknown }).trips) ||
    typeof (data as { expenses?: unknown }).expenses !== "object" ||
    !Array.isArray((data as { persons?: unknown }).persons) ||
    !Array.isArray((data as { categories?: unknown }).categories) ||
    typeof (data as { settings?: unknown }).settings !== "object"
  ) {
    throw new BackupError("This file isn't a valid Baraabar backup.");
  }
  return data as BackupV1;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export interface MergeResult {
  trips: number;
  expenses: number;
  persons: number;
  categories: number;
}

export async function importMerge(backup: BackupV1): Promise<MergeResult> {
  // Persons — dedup by id, fall back to normalized name
  const existingPersons = personsStore.getSnapshot();
  const personIdByName = new Map<string, string>();
  const personById = new Map(existingPersons.map((p) => [p.id, p]));
  existingPersons.forEach((p) =>
    personIdByName.set(normalizeName(p.name), p.id),
  );
  let newPersons = 0;
  for (const p of backup.persons) {
    if (personById.has(p.id)) continue;
    const nameKey = normalizeName(p.name);
    if (personIdByName.has(nameKey)) continue;
    personById.set(p.id, p);
    personIdByName.set(nameKey, p.id);
    newPersons += 1;
  }
  personsStore.replace([...personById.values()]);

  // Categories — dedup by id (incoming wins)
  const existingCats = categoriesStore.getSnapshot();
  const catById = new Map(existingCats.map((c) => [c.id, c]));
  let newCats = 0;
  for (const c of backup.categories) {
    if (!catById.has(c.id)) newCats += 1;
    catById.set(c.id, c);
  }
  categoriesStore.replace([...catById.values()]);

  // Trips — dedup by id (incoming wins on conflict)
  const existingTrips = tripsStore.getSnapshot();
  const tripById = new Map(existingTrips.map((t) => [t.id, t]));
  let newTrips = 0;
  for (const t of backup.trips) {
    if (!tripById.has(t.id)) newTrips += 1;
    tripById.set(t.id, t);
  }
  tripsStore.replace([...tripById.values()]);

  // Expenses — per-trip replace (incoming wins on conflict, dedup by id)
  let newExpenses = 0;
  for (const [tripId, list] of Object.entries(backup.expenses)) {
    const store = expensesStoreFor(tripId);
    await store.ready;
    const existing = store.getSnapshot();
    const byId = new Map(existing.map((e) => [e.id, e]));
    for (const e of list) {
      if (!byId.has(e.id)) newExpenses += 1;
      byId.set(e.id, e);
    }
    store.replace([...byId.values()]);
  }

  // Settings — incoming wins
  settingsStore.replace(backup.settings);

  return {
    trips: newTrips,
    expenses: newExpenses,
    persons: newPersons,
    categories: newCats,
  };
}

export async function importReplace(backup: BackupV1): Promise<MergeResult> {
  await clearAllData();
  // After clearAllData, the migrations flag is gone. The backup is post-migration
  // shape, so re-set the flag to avoid re-running the migration on next boot.
  preserveV1MigrationFlag();

  personsStore.replace(backup.persons);
  categoriesStore.replace(backup.categories);
  tripsStore.replace(backup.trips);
  settingsStore.replace(backup.settings);

  for (const [tripId, list] of Object.entries(backup.expenses)) {
    expensesStoreFor(tripId).replace(list);
  }

  return {
    trips: backup.trips.length,
    expenses: Object.values(backup.expenses).reduce(
      (sum, l) => sum + l.length,
      0,
    ),
    persons: backup.persons.length,
    categories: backup.categories.length,
  };
}
