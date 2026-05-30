# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Baraabar — an Expo / React Native bill splitter for trips. Local-only (no network): the `android.permissions` list explicitly **blocks** `INTERNET` and `ACCESS_NETWORK_STATE`. Don't introduce code that depends on network access.

The Expo `slug` is `baraabar`; the package name on Android is `com.cypherab01.baraabar`. The repo directory name (`bill-splitter`) and `package.json` name don't match the product — use `app.json` as the source of truth for branding.

## Commands

Package manager is **pnpm** (see `pnpm-lock.yaml`, `pnpm-workspace.yaml` with `nodeLinker: hoisted`). Use `pnpm` rather than `npm` for installs.

- `pnpm start` — Expo dev server (Metro)
- `pnpm ios` / `pnpm android` / `pnpm web` — start with a target
- `pnpm lint` — `expo lint` (flat config in `eslint.config.js`, extends `eslint-config-expo/flat`)

There is **no test runner configured**. Don't claim "tests pass" — there are none.

EAS build profiles in `eas.json`: `development` (dev client, internal), `preview` (internal APK), `production` (app-bundle, `autoIncrement: true`). The EAS project ID is wired in `app.json` under `extra.eas.projectId`.

## Architecture

### Routing — expo-router with typed routes

File-based routing under `app/`. The root `app/_layout.tsx` declares the Stack and which screens are presented as modals. Modal screens: `trip/new`, `trip/[id]/members`, `trip/[id]/expense/new`, `trip/[id]/expense/[expenseId]`. Tabs live under `app/(tabs)/` (Trips / Compare / About).

`typedRoutes` and `reactCompiler` are enabled experiments in `app.json`; `newArchEnabled: true`. Don't add babel/reanimated config that conflicts with the React Compiler — it's on by default for this project.

### State / persistence — custom AsyncStorage store, not Redux/Zustand/etc.

`storage/asyncStore.ts` is a hand-rolled store factory built on `AsyncStorage` + `useSyncExternalStore`. It debounces persistence (150ms default) and exposes a snapshot/subscribe API. Components read via the hooks in `hooks/useTrips.ts` and `hooks/useAllExpenses.ts`.

The data model is split across **multiple stores keyed by trip id** rather than one global blob:

- `tripsStore` — array of `Trip` (key `@bills/trips`)
- `expensesStoreFor(tripId)` — lazily-created `Expense[]` store per trip (key `@bills/expenses:<tripId>`)

When mutating, **always go through `storage/tripsStore.ts` helpers** (`createTrip`, `addExpense`, `removeMember`, `clearAllData`, etc.). They keep both stores in sync — e.g. `deleteTrip` removes the in-memory expense store, the `AsyncStorage` row, and the trip itself; `removeMember` enforces invariants (min 2 members, can't remove a member who has paid for expenses) **and also strips the removed id from every expense's `splitWith` array, dropping the field entirely if the set empties**.

`clearAllData` deletes every key starting with `@bills/`. If you add a new persisted bucket, prefix its key with `@bills/` so it participates in clear-all.

### Settlement math — `lib/settle.ts`

`calculateSettlement(trip, expenses)` returns balances + a minimal transfer list using a greedy creditor/debtor pairing (`computeTransfers`). All amounts are rounded to cents via `roundCents`; comparisons use an `EPS = 0.01` tolerance. Don't switch to float equality.

Each expense divides by its own **effective share set** (`effectiveShareSet`), not by `trip.members.length`. If `expense.splitWith` is set, only those members owe a share; if it's `undefined`, everyone owes. Stale ids (members removed after the expense was created) are filtered at calc time and fall back to "everyone" if every id is stale. `Settlement.perPerson` is still computed as `totalSpent / memberCount` for backward compat, but it's meaningless when any expense has a `splitWith` — use the exported `hasPartialSplits(expenses)` to detect that case and avoid showing a misleading equal-share number (see `app/trip/[id].tsx` for the "Varies" treatment).

### Global stores — Persons, Categories, Settings

Trips no longer fully own their members. `storage/personsStore.ts` is a global `Person { id, name, createdAt }` list (key `@bills/persons`); `Member.personId` optionally links a trip-Member to a Person so a single friend can be recognized across trips. The per-trip `Member.name` is kept as a *trip-local snapshot* — renaming a Person doesn't cascade unless the user opts in via the "Also rename in all trips" toggle on the People screen.

`storage/categoriesStore.ts` (`@bills/categories`) replaces the hardcoded `CategoryKey` enum. Categories are `Category { id, label, emoji, isDefault, archivedAt? }`. Defaults (`food/transport/stay/ticket`) seed on first launch with string ids that match those values. `Expense.categoryId` is a plain string id; the old `Expense.category` and `Expense.customCategoryLabel` are gone. Archived categories are hidden from new-expense pickers but still resolve for old expenses that reference them.

`storage/settingsStore.ts` (`@bills/settings`) holds `AppSettings { themeMode: "system" | "light" | "dark" }`; `ThemeProvider` reads it and falls back to `useColorScheme()` when mode is `"system"`.

### Bootstrap & migrations

`app/_layout.tsx` gates the entire app behind a bootstrap effect that:

1. Awaits every store's `ready` promise.
2. Calls `seedDefaultCategoriesIfEmpty()` (corruption guard).
3. Runs `runV1Migration()` from `storage/migrations.ts` if `@bills/migrations` doesn't have `v1-persons-and-categories: true`. The migration walks `tripsStore`, builds Persons from unique normalized member names (case-insensitive, oldest-trip name wins), links every `Member.personId`, converts every legacy `expense.category` / `customCategoryLabel` to a `Category` + `categoryId`, then sets the flag.

The migration is idempotent — each step upserts by id — so a crash retries on next launch.

`clearAllData` was extracted to `storage/clearAll.ts` (re-exported from `tripsStore.ts` for back-compat). It wipes every `@bills/*` AsyncStorage key AND resets the in-memory state of `tripsStore`, `personsStore`, `categoriesStore`, `settingsStore`, `migrationsStore`, plus the per-trip expense-store cache.

### More hub & settings routing

`app/(tabs)/more.tsx` is the third tab (replacing `profile.tsx`). It's a thin list that pushes onto `app/settings/*` screens:

- `app/settings/people.tsx` — manage Persons; rename with optional cascade; usage-aware delete.
- `app/settings/categories.tsx` — manage Categories; rename/emoji/archive/delete with usage check; defaults can be reset but not hard-deleted.
- `app/settings/theme.tsx` — System/Light/Dark radio.
- `app/settings/data.tsx` — Export / Import via `lib/backup.ts`.
- `app/settings/about.tsx` — moved here from the old About tab.

These are pushed Stack screens (not modals); expo-router auto-detects them — no manual declaration needed in `app/_layout.tsx`.

### Trip-create chip picker

`app/trip/new.tsx` no longer takes raw text names. It shows a chip multi-select over `personsStore`, sorted by recent use, with a `+ New person` inline affordance. New people are persisted globally via `createPerson` and auto-selected. `createTrip` now takes `{ members: { personId, name }[] }` (not the old `memberNames: string[]`).

### Backup / restore

`lib/backup.ts` exports `BackupV1` shape (`app: "baraabar", schemaVersion: 1, ...`). `exportToFile` writes to `FileSystem.cacheDirectory` (via `expo-file-system/legacy` — v56's top-level export deprecated the imperative API) and hands off to `expo-sharing`. `pickAndReadBackup` uses `expo-document-picker`. Two import modes:

- **Merge** — dedup by id (incoming wins on conflict), Persons additionally dedup by case-insensitive name.
- **Replace** — calls `clearAllData()`, re-seeds the migration flag (the backup is already in post-migration shape), and loads.

If you add a new persisted bucket, prefix its key with `@bills/` AND add a reset call inside `storage/clearAll.ts`.

### Theming

`theme/tokens.ts` defines `palettes`, `spacing`, `radii`, `typography` and the `Theme` shape. `theme/ThemeProvider.tsx` reads `useColorScheme()` and builds the theme; `app/_layout.tsx` then mirrors those tokens into a React Navigation `NavTheme` and also calls `SystemUI.setBackgroundColorAsync` so the native window background matches.

Components consume the theme via `useTheme()`. There's no StyleSheet object built off the theme — styles are inline using theme values. Follow that pattern rather than introducing a styled-components / NativeWind layer.

Fonts: Inter (400/500/600/700) loaded via `@expo-google-fonts/inter` in the root layout; the splash screen is held until fonts load. Always reference fonts through `theme.typography.*` or `fontFamily.*` — don't hardcode `"Inter_..."` strings in new components (`components/Text.tsx` is the one allowed exception because it maps a `weight` prop).

### Path alias

`@/*` → repo root (`tsconfig.json`). Use it for cross-directory imports (`@/theme`, `@/storage/tripsStore`, `@/types/models`).

### IDs

`nanoid/non-secure` is used for trip/member/expense IDs. Don't swap to crypto-grade nanoid — non-secure is intentional (no crypto available, ids are local-only).
