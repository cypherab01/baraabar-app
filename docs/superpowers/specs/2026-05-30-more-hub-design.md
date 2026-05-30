# More Hub — Global Users, Editable Categories, Theme & Backup — Design

**Date:** 2026-05-30
**Status:** Draft, pending user review

## Problem

The "About" tab today holds only developer info plus a "Clear all data" action. Several pieces of cross-cutting functionality have no home:

1. **Members are trip-local.** The same friend re-entered as text on every new trip — no reuse, no graph signal across trips.
2. **Categories are hardcoded.** The `CategoryKey` enum (`food | transport | stay | activities | shopping | other`) is baked into the type system; users can't rename, add, or hide. The `customCategoryLabel` field is a brittle workaround.
3. **Theme is OS-locked.** App follows `useColorScheme()` with no override.
4. **No backup story.** Since the app is intentionally offline (no `INTERNET` permission), losing the device or reinstalling means losing every trip.

## Goal

Repurpose the third tab as a **"More"** hub that owns these settings/data features:

- A global **People** list with a chip-style picker on new-trip creation, reusing past friends.
- User-editable **Categories** with four defaults: Food, Transport, Stay, Ticket.
- A **Theme** picker: System / Light / Dark.
- **Import / Export** to a local JSON backup file.
- The existing About content moves into a sub-screen of this hub.

## Non-goals

- Cloud sync, account login, or any network feature (would violate the app's offline guarantee).
- CSV import/export (deferred; JSON only).
- Per-trip member editing UI rework (`/trip/[id]/members` keeps its text-input UX).
- Retroactive cascade of Person renames into past trips (opt-in toggle only).
- Migrating expense IDs / payerId / splitWith from member-IDs to person-IDs (Member layer stays intact).
- Theme accent-color customization.

## Data model

### New types (`types/models.ts`)

```ts
export interface Person {
  id: string;
  name: string;
  createdAt: number;
}

export interface Category {
  id: string;           // stable string id; defaults use literal "food", "transport", "stay", "ticket"
  label: string;
  emoji: string;
  isDefault: boolean;   // user cannot hard-delete defaults; archive only
  archivedAt?: number;
}

export interface AppSettings {
  themeMode: "system" | "light" | "dark";
}
```

### Mutated types

```ts
export interface Member {
  id: string;
  name: string;
  personId?: string;    // NEW: optional link to a global Person; per-trip name takes precedence
}

export interface Expense {
  id: string;
  tripId: string;
  payerId: string;
  amount: number;
  categoryId: string;   // RENAMED from `category: CategoryKey`; now a string id into categoriesStore
  note?: string;
  createdAt: number;
  splitWith?: string[];
  // REMOVED: customCategoryLabel — Category owns its own label now
}
```

The existing `CategoryKey` union and `CATEGORIES` const are removed from `types/models.ts`. Any code that imported `CategoryKey` switches to `Category["id"]` (alias `CategoryId = string`).

### New stores (`storage/`)

All keys prefixed `@bills/` so `clearAllData()` continues to wipe them.

| Store              | Key                  | Type           |
| ------------------ | -------------------- | -------------- |
| `personsStore`     | `@bills/persons`     | `Person[]`     |
| `categoriesStore`  | `@bills/categories`  | `Category[]`   |
| `settingsStore`    | `@bills/settings`    | `AppSettings`  |
| `migrationsStore`  | `@bills/migrations`  | `Record<string, true>` |

All built on the existing `createAsyncStore` factory (no new persistence machinery).

### Bootstrap & one-time migration

A single bootstrap routine runs from `app/_layout.tsx`'s mount effect before the splash screen hides, so the UI never observes intermediate state. It runs every launch but each step is a no-op when not needed.

**Step 0 — Default seeding (every launch, idempotent guard).** If `categoriesStore.getSnapshot()` is empty, seed the four defaults:

```ts
[
  { id: "food",      label: "Food",      emoji: "🍽️", isDefault: true },
  { id: "transport", label: "Transport", emoji: "🚖", isDefault: true },
  { id: "stay",      label: "Stay",      emoji: "🏨", isDefault: true },
  { id: "ticket",    label: "Ticket",    emoji: "🎟️", isDefault: true },
]
```

If `settingsStore.getSnapshot()` is empty, write `{ themeMode: "system" }`. `personsStore` is left empty (the migration backfills it).

**Step 1 — One-time migration `v1-persons-and-categories`.** Guarded by `migrationsStore["v1-persons-and-categories"]`. Runs once, idempotent, retries automatically on crash because the flag is only set on success. Skipped entirely on fresh installs (no existing trips means each substep is a no-op, but the flag still gets set to avoid re-walking on every launch).

1. **Persons backfill.** Walk every trip's members. Build a `Map<normalizedName, personId>` where `normalizedName = name.trim().toLowerCase()`. For each unique normalized name, create a `Person`:
   - `id`: `nanoid(10)`
   - `name`: the original casing from the Member in the *oldest* trip that contains this normalized name (tiebreaker: smallest `trip.createdAt`)
   - `createdAt`: that same oldest `trip.createdAt`
   Then update every existing `Member.personId` to the matching personId. Persist `personsStore` and rewrite `tripsStore` in a single batched write.
2. **Categories backfill.** Inspect every expense across all trips. For each distinct `expense.category` value seen:
   - `"food" | "transport" | "stay"` → already in defaults, nothing to do.
   - `"activities" | "shopping" | "other"` → create a `Category` with the same id, `isDefault: false`, label and emoji copied from the old (now-removed) `CATEGORIES` constant.
   - If `expense.customCategoryLabel` is set → create a new Category with `id: nanoid(8)`, label = the custom label, emoji `"✨"`, `isDefault: false`. Rewrite that expense's `categoryId` to point to the new category.
3. **Expense field rename.** For every expense, set `categoryId = category` (string-to-string, same value), then drop the `category` and `customCategoryLabel` fields. Implemented as a single map over each per-trip expense array.
4. Set `migrationsStore["v1-persons-and-categories"] = true`.

## Routing

### Tab rename

`app/(tabs)/profile.tsx` → `app/(tabs)/more.tsx`.

In `app/(tabs)/_layout.tsx`:

```diff
- name="profile"
+ name="more"
  options={{
-   title: "About",
+   title: "More",
    tabBarIcon: ({ focused, color, size }) => (
      <Ionicons
-       name={focused ? "person-circle" : "person-circle-outline"}
+       name={focused ? "ellipsis-horizontal-circle" : "ellipsis-horizontal-circle-outline"}
        size={size ?? 24}
        color={color}
      />
    ),
  }}
```

### More hub screen (`app/(tabs)/more.tsx`)

A single `ScrollView` with three `Card` groups:

```
Manage
  People         → /settings/people
  Categories     → /settings/categories
  Theme          → /settings/theme

Data
  Import / Export → /settings/data

About
  About Baraabar  → /settings/about
  Privacy policy  (opens DEVELOPER.privacyPolicyUrl externally, as today)

(destructive, bottom)
  Clear all data
```

Each row is the existing `LinkRow` component (extracted from `profile.tsx`).

### New sub-screens (pushed Stack, not modal)

Five files live under a new `app/settings/` directory:

- `app/settings/people.tsx`
- `app/settings/categories.tsx`
- `app/settings/theme.tsx`
- `app/settings/data.tsx`
- `app/settings/about.tsx` (the existing developer-info content from `(tabs)/profile.tsx`)

Expo-router auto-detects these and adds them to the root Stack. They render with the default back-arrow header, no explicit declaration needed in `app/_layout.tsx` (which only declares the modal screens today).

## People (global users)

### `/settings/people` — manage screen

- Header: `<AppHeader title="People" subtitle="Friends you've shared trips with" showBack />`.
- Sorted by **recent use** (descending count of trips referencing the person, ties broken by `createdAt` desc).
- Each row: avatar circle with initials, name, `"Used in N trips"` subtitle.
- Tap row → bottom-sheet with:
  - Rename text field (writes to `Person.name`).
  - "Also rename in all trips" toggle (default off). When on, the save action also rewrites every `Member.name` in `tripsStore` where `Member.personId === this.id` to the new value, in a single batched `tripsStore.set`.
  - "Delete" button — enabled only when `usageCount === 0`; disabled state reads "In use in N trips — can't delete."
- "+ Add person" pinned button at the bottom (creates a Person without linking it to any trip yet — useful for pre-populating before a trip).

### Picker on `app/trip/new.tsx`

Replace the current vertical list of `TextField`s with a chip picker inside the existing "People" `Card`:

- Render selected chips first (accent fill), then unselected chips (soft border), then a trailing `+ New person` chip.
- Tap a chip → toggle inclusion (haptic light).
- Tap `+ New person` → inline `TextField` expands below the chip row; submit creates a new Person (nanoid id), auto-selects it, collapses the input.
- Each selected Person becomes a `Member { id: nanoid(8), personId, name: person.name }` on submit. `createTrip` swaps its input from `{ memberNames: string[] }` to `{ members: { personId: string; name: string }[] }` (the only caller is `app/trip/new.tsx`, so no compat shim is needed).
- Validation unchanged: ≥ 2 selected.
- Sort order: most-recently-used Persons appear first, so frequent travel buddies are one tap away.

### Existing trip member edits

`app/trip/[id]/members.tsx` is unchanged in this round. Adding a member via that screen still creates a Member without a personId (acceptable; the user can link it later via the People screen, which is a future enhancement, not in this scope).

## Categories

### `/settings/categories` — manage screen

- Header: `<AppHeader title="Categories" subtitle="Tag your expenses" showBack />`.
- One list, both defaults and user-added intermixed, ordered: defaults first in seed order (Food → Transport → Stay → Ticket), then user-added by `createdAt` desc. Archived categories appear in a collapsed "Archived" section at the bottom.
- Each row: emoji, label, faint trailing badge `"Default"` if `isDefault`. Tap → edit sheet:
  - Rename label (text field).
  - Change emoji: a small grid of common picks (`🍽️ 🚖 🏨 🎟️ 🍻 🛒 🎁 🏥 🎵 ✨`) plus a free-text emoji input (accepts any grapheme cluster).
  - **Defaults:** "Archive" button. "Reset to default" button (restores original label + emoji).
  - **User categories:** "Archive" and "Delete" buttons. Delete is enabled only when usageCount = 0; otherwise disabled with "Used by N expenses — archive instead."
- "+ New category" pinned button at the bottom.

### Expense form integration

In `app/trip/[id]/expense/new.tsx` and `[expenseId].tsx`:

- Replace the import of the hardcoded `CATEGORIES` const with a `useCategories()` hook backed by `categoriesStore`.
- Chip row renders only non-archived categories. Selection writes `categoryId` (the string id, not an enum value).
- Remove the "Other → custom label" inline input flow entirely.
- For editing an expense whose `categoryId` references an archived (or missing) category: render that chip in the selected state with an `"(archived)"` suffix and muted styling, so the user sees what was previously chosen. Switching to any active category is a normal toggle.

### Settlement / Compare screens

`lib/settle.ts` and the Compare tab don't switch on category — they only group/sum by `categoryId` for display. They read labels via a `categoriesById` lookup from the store. When a referenced id is missing, fall back to `{ label: "Unknown", emoji: "•" }`.

## Theme

### `/settings/theme`

- Three radio rows in a single `Card`: System / Light / Dark.
- Selection writes `settingsStore.themeMode` immediately (no Save). Haptic light on change.
- A small swatch preview at the top of the screen shows the three primary surfaces (`bg`, `surface`, `accent`) so the user sees the effect of the chosen mode.

### `theme/ThemeProvider.tsx`

```ts
// before
const scheme = useColorScheme();

// after
const settings = useSettings();              // new hook backed by settingsStore
const osScheme = useColorScheme();
const scheme: ColorScheme =
  settings.themeMode === "system"
    ? (osScheme ?? "light")
    : settings.themeMode;
```

Everything downstream (`NavTheme` in `app/_layout.tsx`, `SystemUI.setBackgroundColorAsync`) re-runs naturally on `scheme` change.

## Import / Export

### `/settings/data`

Two action rows in a `Card`:

```
Back up to file      [Export]
Restore from file    [Import]
```

### Export flow

1. Snapshot every store in memory (synchronous reads via `tripsStore.getSnapshot()` etc.).
2. Build:

```ts
{
  app: "baraabar",
  schemaVersion: 1,
  exportedAt: Date.now(),
  trips: Trip[],
  expenses: Record<string, Expense[]>,   // keyed by tripId
  persons: Person[],
  categories: Category[],
  settings: AppSettings,
}
```

3. Stringify with 2-space indentation (small enough that pretty-printing is fine; aids manual inspection).
4. Write to `FileSystem.cacheDirectory + "baraabar-backup-YYYY-MM-DD.json"` via `expo-file-system`.
5. Hand off via `Sharing.shareAsync(fileUri, { mimeType: "application/json", dialogTitle: "Baraabar backup" })` from `expo-sharing`. The OS share sheet (Files / Drive / WhatsApp / AirDrop / etc.) handles destination — no INTERNET permission needed on our side.

### Import flow

1. `DocumentPicker.getDocumentAsync({ type: "application/json", copyToCacheDirectory: true })` from `expo-document-picker`.
2. Read the file, `JSON.parse`. Wrap in try/catch; on parse error show "This file isn't a valid Baraabar backup."
3. Validate: `app === "baraabar"`, `schemaVersion === 1`, top-level keys present and of the right shape (`Array.isArray(trips)` etc.). Reject otherwise with a clear message — no partial writes.
4. Show a confirm sheet:
   - **Merge** (default radio): for each entity type, dedup by id (incoming wins on conflict for trips/expenses/categories; persons dedup additionally by normalized-name case-insensitive). Append the rest. Validates a per-store write at the end.
   - **Replace** (destructive radio): the action button switches to a typed-confirm sheet — user types `REPLACE` to enable the button. Then `clearAllData()` runs, the migrations flag is preserved (we keep `@bills/migrations` so we don't re-run migrations against the imported, already-current data), and the backup is loaded into the stores.
5. After successful import, navigate back to More and toast: "Imported N trips, M people."

### New dependencies

| Package                | Purpose                                |
| ---------------------- | -------------------------------------- |
| `expo-file-system`     | Write backup JSON to cache directory   |
| `expo-sharing`         | OS share sheet for the saved file      |
| `expo-document-picker` | Pick a backup file for import          |

All three are first-party Expo, work fully offline, and add no new permissions (the picker uses the system Files UI; sharing dispatches to the OS share sheet).

### Schema versioning

`schemaVersion: 1` in the export. A small `BACKUP_MIGRATIONS: Record<number, (data) => SchemaV1>` map lives in `lib/backup.ts` so future shape changes can upgrade older backups at import time. For now it's a one-entry identity map.

## Failure modes & guards

- **Migration crash mid-flight.** The success flag is only set after every store write completes, so a crash leaves the flag unset and the migration retries on next launch. Each step is idempotent (id-based upserts).
- **Categories store empty at boot.** Re-seed defaults before mounting any expense form — happens in the same effect that runs the migration.
- **Expense referencing a missing/archived categoryId.** Resolved to a sentinel `{ label: "Unknown", emoji: "•" }` for display; the expense remains editable and savable.
- **Member without `personId`.** Continues to work trip-locally (its name still renders); it simply doesn't appear in the global People list and contributes nothing to cross-trip patterns. This round ships no retroactive-linking UI for such Members — they remain unlinked until that future enhancement.
- **Import schema mismatch / corrupt JSON.** Validation rejects with a single-message error; no store is touched.
- **Replace import preserving migrations flag.** `clearAllData()` wipes every `@bills/` key including `@bills/migrations`. We explicitly re-write the v1 flag after the replace completes — the imported v1 backup is already in the post-migration shape, so re-running the migration would be a no-op, but skipping it avoids needless work and any future v1-step that isn't perfectly idempotent.

## Phasing

One bundled feature branch. The implementation plan will order steps so each commit boundary keeps the app launchable:

1. Data model rename + migration + new stores.
2. More hub tab rename, sub-screen scaffolding, About move.
3. Persons store, People screen, trip-create picker.
4. Categories store, Categories screen, expense-form integration.
5. Theme picker + ThemeProvider rewire.
6. Import/Export (`/settings/data`, deps install).
7. CLAUDE.md update documenting the new architecture pieces.

## Out of scope (explicit)

- CSV export/import.
- Cloud sync, account, or any network feature.
- Per-trip member-edit screen redesign.
- Default cascade of Person renames into Member.name across past trips (opt-in only).
- Theme accent customization.
- Graph-pattern analytics across trips (data model now supports it; UI deferred).
