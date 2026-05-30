# Partial Expense Splits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users mark any expense as split among a subset of trip members. The default flow (split among everyone) is unchanged.

**Architecture:** Add an optional `splitWith?: string[]` field on `Expense`. `lib/settle.ts` divides each expense by its effective share set rather than the trip's full member count. `ExpenseForm` gains a toggle that reveals an inline member chip selector when off. `ExpenseRow` shows a "Split with X, Y +N" subtitle when an expense is partial. Two "per-person" surfaces on the trip detail screen relabel themselves when any expense in the trip has a custom split.

**Tech Stack:** TypeScript, React Native, Expo Router, AsyncStorage-backed custom store (`storage/asyncStore.ts`). No test runner is configured — verification is type-check (`pnpm exec tsc --noEmit`), lint (`pnpm lint`), and manual run in the Expo dev server.

**Reference docs:**
- Spec: `docs/superpowers/specs/2026-05-30-partial-expense-splits-design.md`
- Project conventions: `CLAUDE.md`

---

## Task 1: Add `splitWith` field to the Expense type

**Files:**
- Modify: `types/models.ts`

- [ ] **Step 1: Add the optional field**

Edit `types/models.ts`. Append `splitWith?: string[]` to the `Expense` interface (after `createdAt`):

```ts
export interface Expense {
  id: string;
  tripId: string;
  payerId: string;
  amount: number;
  category: CategoryKey;
  customCategoryLabel?: string;
  note?: string;
  createdAt: number;
  splitWith?: string[];
}
```

No JSDoc comment — the field's meaning is documented in the spec and surfaced via UI labels.

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: passes with no new errors.

- [ ] **Step 3: Commit**

```bash
git add types/models.ts
git commit -m "Add optional splitWith field to Expense"
```

---

## Task 2: Update settlement math for per-expense share sets

**Files:**
- Modify: `lib/settle.ts`

- [ ] **Step 1: Rewrite `calculateSettlement` to use a per-expense effective share set**

Replace the body of `calculateSettlement` in `lib/settle.ts` with the version below. Key changes:

1. Each member tracks `owed` separately (not derived from a single `perPerson`).
2. `effectiveShareSet(expense, memberIds)` computes the set: `splitWith` ∩ current members, falling back to all members if the intersection is empty.
3. `Settlement.perPerson` is kept (today's formula `total / N`) for backward compatibility with anything that reads it, but is no longer the basis for `balance`.

```ts
export function calculateSettlement(trip: Trip, expenses: Expense[]): Settlement {
  const memberIds = trip.members.map((m) => m.id);
  const memberCount = memberIds.length;
  const nameFor = (id: string) =>
    trip.members.find((m) => m.id === id)?.name ?? "?";

  const spentByMember = new Map<string, number>();
  const owedByMember = new Map<string, number>();
  for (const id of memberIds) {
    spentByMember.set(id, 0);
    owedByMember.set(id, 0);
  }

  let totalSpent = 0;
  for (const e of expenses) {
    totalSpent += e.amount;
    spentByMember.set(
      e.payerId,
      (spentByMember.get(e.payerId) ?? 0) + e.amount,
    );

    const shareSet = effectiveShareSet(e, memberIds);
    if (shareSet.length === 0) continue;
    const share = e.amount / shareSet.length;
    for (const id of shareSet) {
      owedByMember.set(id, (owedByMember.get(id) ?? 0) + share);
    }
  }

  const perPerson = memberCount > 0 ? totalSpent / memberCount : 0;

  const byMember: MemberBalance[] = trip.members.map((m) => {
    const spent = spentByMember.get(m.id) ?? 0;
    const owed = owedByMember.get(m.id) ?? 0;
    return {
      memberId: m.id,
      memberName: m.name,
      spent: roundCents(spent),
      balance: roundCents(spent - owed),
    };
  });

  const transfers = computeTransfers(byMember, nameFor);

  return {
    totalSpent: roundCents(totalSpent),
    perPerson: roundCents(perPerson),
    byMember,
    transfers,
  };
}

function effectiveShareSet(expense: Expense, memberIds: string[]): string[] {
  if (!expense.splitWith) return memberIds;
  const valid = expense.splitWith.filter((id) => memberIds.includes(id));
  return valid.length > 0 ? valid : memberIds;
}
```

`computeTransfers` and `roundCents` are unchanged. Leave them as-is.

- [ ] **Step 2: Add the `hasPartialSplits` helper**

Add at the bottom of `lib/settle.ts`:

```ts
export function hasPartialSplits(expenses: Expense[]): boolean {
  return expenses.some((e) => e.splitWith != null);
}
```

This is consumed by `app/trip/[id].tsx` to relabel the two "per-person" surfaces.

- [ ] **Step 3: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: passes.

- [ ] **Step 4: Sanity-walk the math by hand**

Don't run anything yet — just verify the new logic against this scenario before committing:

> Trip with members A, B, C. Two expenses:
> 1. A paid Rs 300, `splitWith = undefined` (everyone).
> 2. A paid Rs 600, `splitWith = [B, C]` (A didn't consume).
>
> Expected:
> - `totalSpent = 900`
> - A: spent 900, owed 100 (from expense 1 only), balance +800
> - B: spent 0, owed 100 + 300 = 400, balance −400
> - C: spent 0, owed 100 + 300 = 400, balance −400
> - Transfers: B → A 400, C → A 400.
>
> Trace the code above with these numbers. Confirm each number lines up. If not, stop and re-read the code before continuing.

- [ ] **Step 5: Commit**

```bash
git add lib/settle.ts
git commit -m "Split expenses by per-expense share set"
```

---

## Task 3: Plumb `splitWith` through storage helpers and strip it on member removal

**Files:**
- Modify: `storage/tripsStore.ts`

- [ ] **Step 1: Accept `splitWith` on `NewExpenseInput` and propagate it**

In `storage/tripsStore.ts`, update `NewExpenseInput` and `addExpense`:

```ts
export interface NewExpenseInput {
  tripId: string;
  payerId: string;
  amount: number;
  category: Expense["category"];
  customCategoryLabel?: string;
  note?: string;
  splitWith?: string[];
}

export function addExpense(input: NewExpenseInput): Expense {
  const expense: Expense = {
    id: nanoid(10),
    tripId: input.tripId,
    payerId: input.payerId,
    amount: input.amount,
    category: input.category,
    customCategoryLabel: input.customCategoryLabel?.trim() || undefined,
    note: input.note?.trim() || undefined,
    createdAt: Date.now(),
    splitWith: input.splitWith,
  };
  expensesStoreFor(input.tripId).set((prev) => [expense, ...prev]);
  return expense;
}
```

`updateExpense` already takes a `Partial<Omit<Expense, "id" | "tripId" | "createdAt">>`, so `splitWith` flows through automatically. No change needed there.

- [ ] **Step 2: Strip removed member ids from `splitWith` on member removal**

Replace `removeMember` in `storage/tripsStore.ts`:

```ts
export function removeMember(tripId: string, memberId: string): boolean {
  const trip = tripsStore.getSnapshot().find((t) => t.id === tripId);
  if (!trip) return false;
  if (trip.members.length <= 2) return false;
  const expensesStore = expensesStoreFor(tripId);
  const expenses = expensesStore.getSnapshot();
  if (expenses.some((e) => e.payerId === memberId)) return false;

  tripsStore.set((prev) =>
    prev.map((t) =>
      t.id === tripId
        ? { ...t, members: t.members.filter((m) => m.id !== memberId) }
        : t,
    ),
  );

  expensesStore.set((prev) =>
    prev.map((e) => {
      if (!e.splitWith) return e;
      const next = e.splitWith.filter((id) => id !== memberId);
      if (next.length === e.splitWith.length) return e;
      if (next.length === 0) {
        const { splitWith: _omit, ...rest } = e;
        return rest;
      }
      return { ...e, splitWith: next };
    }),
  );

  return true;
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add storage/tripsStore.ts
git commit -m "Carry splitWith through storage and clean it on member removal"
```

---

## Task 4: Add toggle + chip selector to the expense form

**Files:**
- Modify: `components/ExpenseForm.tsx`

- [ ] **Step 1: Add state and derived values**

In `components/ExpenseForm.tsx`, just after the existing `useState` calls, add:

```ts
const [splitEveryone, setSplitEveryone] = useState(!existing?.splitWith);
const [selectedSplitIds, setSelectedSplitIds] = useState<Set<string>>(() => {
  if (existing?.splitWith) {
    const valid = existing.splitWith.filter((id) =>
      trip.members.some((m) => m.id === id),
    );
    return new Set(valid);
  }
  return new Set(trip.members.map((m) => m.id));
});
```

Replace the existing `canSubmit` declaration with:

```ts
const selectedCount = splitEveryone ? trip.members.length : selectedSplitIds.size;

const canSubmit =
  parsedAmount != null &&
  parsedAmount > 0 &&
  Boolean(payerId) &&
  (category !== "other" || customLabel.trim().length > 0) &&
  selectedCount > 0;

const perShare =
  parsedAmount != null && parsedAmount > 0 && selectedCount > 0
    ? parsedAmount / selectedCount
    : null;
```

- [ ] **Step 2: Update the toggle handler and on-save payload**

Add right above the existing `onSave`:

```ts
const toggleSplitEveryone = (next: boolean) => {
  setSplitEveryone(next);
  if (!next) {
    // entering partial mode: pre-select all members
    setSelectedSplitIds(new Set(trip.members.map((m) => m.id)));
  }
  Haptics.selectionAsync().catch(() => {});
};

const toggleSplitMember = (id: string) => {
  setSelectedSplitIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  Haptics.selectionAsync().catch(() => {});
};
```

Replace the body of `onSave` (the existing `if (existing) { ... } else { ... }` block) with:

```ts
const splitWith = splitEveryone
  ? undefined
  : Array.from(selectedSplitIds);

if (existing) {
  updateExpense(trip.id, existing.id, {
    amount: parsedAmount,
    payerId,
    category,
    customCategoryLabel:
      category === "other" ? customLabel.trim() : undefined,
    note: note.trim() || undefined,
    splitWith,
  });
} else {
  addExpense({
    tripId: trip.id,
    amount: parsedAmount,
    payerId,
    category,
    customCategoryLabel:
      category === "other" ? customLabel.trim() : undefined,
    note: note.trim() || undefined,
    splitWith,
  });
}
```

Note: when editing an existing partial expense back to "everyone," `updateExpense` is called with `splitWith: undefined`. The store's spread-merge will set the field to `undefined`, which is fine for runtime but persists as `null` in JSON. The settlement code uses `expense.splitWith != null` for "no override," so this round-trips correctly. (`!= null` is intentional — covers both `undefined` and `null`. Verify Task 2's `effectiveShareSet` uses `if (!expense.splitWith)` which also handles both, since `!null === true`.)

- [ ] **Step 3: Render the split UI block**

In the JSX, find the `Note (optional)` `TextField` (around the end of the `KeyboardAwareScrollView`). After that `TextField`, before the closing `</KeyboardAwareScrollView>`, add:

```tsx
<View style={{ gap: theme.spacing.sm }}>
  <Pressable
    onPress={() => toggleSplitEveryone(!splitEveryone)}
    style={{
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: theme.spacing.sm,
    }}
  >
    <View style={{ flex: 1, paddingRight: theme.spacing.md }}>
      <Text variant="bodyMedium">Split equally with everyone</Text>
      <Text variant="caption" tone="muted">
        Turn off to pick who&apos;s splitting this one
      </Text>
    </View>
    <View
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        padding: 2,
        backgroundColor: splitEveryone
          ? theme.colors.accent
          : theme.colors.surfaceAlt,
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: theme.colors.bgElevated,
          alignSelf: splitEveryone ? "flex-end" : "flex-start",
        }}
      />
    </View>
  </Pressable>

  {!splitEveryone ? (
    <View style={{ gap: theme.spacing.sm }}>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        {trip.members.map((m) => {
          const active = selectedSplitIds.has(m.id);
          return (
            <Pressable key={m.id} onPress={() => toggleSplitMember(m.id)}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: theme.radii.pill,
                  backgroundColor: active
                    ? theme.colors.accentSoft
                    : theme.colors.surface,
                  borderWidth: 1,
                  borderColor: active
                    ? theme.colors.accent
                    : theme.colors.border,
                }}
              >
                <Ionicons
                  name={active ? "checkmark-circle" : "ellipse-outline"}
                  size={16}
                  color={active ? theme.colors.accent : theme.colors.textSubtle}
                />
                <Text
                  variant="label"
                  style={{
                    color: active ? theme.colors.text : theme.colors.textMuted,
                    fontFamily: active ? "Inter_600SemiBold" : "Inter_500Medium",
                  }}
                >
                  {m.name}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <Text variant="caption" tone={selectedCount === 0 ? "negative" : "muted"}>
        {selectedCount === 0
          ? "Pick at least one person to split with"
          : perShare != null
            ? `${selectedCount} of ${trip.members.length} splitting · ${formatAmount(perShare, trip.currency)} each`
            : `${selectedCount} of ${trip.members.length} splitting`}
      </Text>
    </View>
  ) : null}
</View>
```

Update the imports at the top of the file: `formatAmount` is needed in addition to the existing `currencySymbol`. Change:

```ts
import { currencySymbol } from "@/lib/format";
```

to:

```ts
import { currencySymbol, formatAmount } from "@/lib/format";
```

- [ ] **Step 4: Type-check and lint**

Run: `pnpm exec tsc --noEmit`
Expected: passes.

Run: `pnpm lint`
Expected: passes (no new warnings on the touched file).

- [ ] **Step 5: Manual verification in the app**

Run: `pnpm start` (or use whatever Expo dev server is convenient). In the running app:

1. Open an existing trip with ≥3 members, tap "Add expense."
2. Confirm toggle is on by default; save flow works exactly as before.
3. Re-open "Add expense." Toggle off → confirm all member chips appear pre-selected, helper reads "N of N splitting · {amount} each."
4. Tap a chip to deselect; helper updates count and per-share.
5. Change the amount; helper per-share updates.
6. Deselect every member; helper turns negative-toned and reads "Pick at least one person…"; Save is disabled (gray).
7. Save with a partial selection; confirm the expense appears in the list (and that the math change from Task 2 reflects only the selected members — covered more thoroughly in Task 7's QA).
8. Re-open the saved partial expense (tap it). Toggle should be **off** and chips hydrated with the saved set.
9. Re-open the saved partial expense, flip toggle back to "on", save. Re-open again — toggle is on, no chip state. (This confirms `splitWith: undefined` round-trips correctly.)

If any step fails, stop and fix before committing.

- [ ] **Step 6: Commit**

```bash
git add components/ExpenseForm.tsx
git commit -m "Add partial split toggle and member chip selector to expense form"
```

---

## Task 5: Show "Split with X, Y +N" on partial expense rows

**Files:**
- Modify: `components/ExpenseRow.tsx`

- [ ] **Step 1: Build the splitWith label**

In `components/ExpenseRow.tsx`, inside the `ExpenseRow` function body after the existing `label` const, add:

```ts
const splitWithLabel = expense.splitWith
  ? buildSplitWithLabel(expense.splitWith, members)
  : null;
```

Add this helper at the bottom of the file (after the component):

```ts
function buildSplitWithLabel(splitWith: string[], members: Member[]): string {
  const validNames = splitWith
    .map((id) => members.find((m) => m.id === id)?.name)
    .filter((n): n is string => Boolean(n));
  if (validNames.length === 0) return "Split with —";
  const head = validNames.slice(0, 2).join(", ");
  const extra = validNames.length - 2;
  return extra > 0 ? `Split with ${head} +${extra}` : `Split with ${head}`;
}
```

- [ ] **Step 2: Render the subtitle line conditionally**

Inside the existing `<View style={{ flex: 1, gap: 2 }}>` block, after the existing caption `<Text>`, add:

```tsx
{splitWithLabel ? (
  <Text variant="caption" tone="muted" numberOfLines={1}>
    {splitWithLabel}
  </Text>
) : null}
```

The row will grow by one text line for partial expenses only; the common case is visually unchanged.

- [ ] **Step 3: Type-check and lint**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: both pass.

- [ ] **Step 4: Manual check**

Reload the dev server. In a trip's expense list:

- Expenses created without `splitWith` look identical to before.
- A partial expense shows a third line "Split with Alex, Sam" (or "+N" if more than 2 members).
- Single-name partial reads "Split with Alex."

- [ ] **Step 5: Commit**

```bash
git add components/ExpenseRow.tsx
git commit -m "Surface partial-split members in expense rows"
```

---

## Task 6: Relabel "per person" surfaces when partial expenses exist

**Files:**
- Modify: `app/trip/[id].tsx`

- [ ] **Step 1: Pass `hasPartialSplits` into `TotalsHero` and `SummaryTab`**

In `app/trip/[id].tsx`, update the import from `lib/settle`:

```ts
import { calculateSettlement, hasPartialSplits, type MemberBalance } from "@/lib/settle";
```

In `TripDetailScreen`, just below the `settlement` `useMemo`, add:

```ts
const anyPartial = useMemo(() => hasPartialSplits(expenses), [expenses]);
```

Pass it to both subviews. Update the `TotalsHero` call site:

```tsx
<TotalsHero
  trip={trip}
  total={settlement?.totalSpent ?? 0}
  anyPartial={anyPartial}
/>
```

And the `SummaryTab` call site:

```tsx
<SummaryTab trip={trip} settlement={settlement!} anyPartial={anyPartial} />
```

- [ ] **Step 2: Update `TotalsHero` subtitle**

Replace the `TotalsHero` signature and the subtitle `<Text>`:

```tsx
function TotalsHero({
  trip,
  total,
  anyPartial,
}: {
  trip: Trip;
  total: number;
  anyPartial: boolean;
}) {
  const theme = useTheme();
  const subtitle =
    trip.members.length === 0
      ? "No members"
      : anyPartial
        ? `Across ${trip.members.length} people · some custom splits`
        : `Split evenly across ${trip.members.length} people`;
  return (
    <Card padded style={{ marginTop: theme.spacing.md }}>
      <Text variant="overline" tone="subtle">
        Total spent
      </Text>
      <Text
        style={{
          fontFamily: "Inter_700Bold",
          fontSize: 40,
          lineHeight: 46,
          letterSpacing: -1,
          color: theme.colors.text,
          marginTop: 4,
          fontVariant: ["tabular-nums"],
        }}
      >
        {formatAmount(total, trip.currency)}
      </Text>
      <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
        {subtitle}
      </Text>
    </Card>
  );
}
```

- [ ] **Step 3: Update the `SummaryTab` "Each person's share" card**

Replace the `SummaryTab` signature and the first `Card padded` block (the one rendering `settlement.perPerson`). The rest of `SummaryTab` (Balances + Settle up) is unchanged.

```tsx
function SummaryTab({
  trip,
  settlement,
  anyPartial,
}: {
  trip: Trip;
  settlement: ReturnType<typeof calculateSettlement>;
  anyPartial: boolean;
}) {
  const theme = useTheme();

  if (settlement.totalSpent === 0) {
    return (
      <EmptyState
        emoji="🧮"
        title="Nothing to settle yet"
        description="Add some expenses to see each person's share and who owes whom."
      />
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingBottom: theme.spacing["2xl"],
        gap: theme.spacing.lg,
      }}
    >
      <Card padded>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text variant="caption" tone="muted">
              Each person&apos;s share
            </Text>
            {anyPartial ? (
              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  fontSize: 22,
                  lineHeight: 28,
                  marginTop: 4,
                  color: theme.colors.text,
                }}
              >
                Varies
              </Text>
            ) : (
              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  fontSize: 28,
                  lineHeight: 34,
                  letterSpacing: -0.5,
                  marginTop: 2,
                  color: theme.colors.text,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {formatAmount(settlement.perPerson, trip.currency)}
              </Text>
            )}
            {anyPartial ? (
              <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
                Some expenses split with a subset
              </Text>
            ) : null}
          </View>
          <Pill
            label={`${trip.members.length} people`}
            tone="accent"
            size="md"
          />
        </View>
      </Card>

      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="overline" tone="subtle">
          Balances
        </Text>
        <View style={{ gap: theme.spacing.sm }}>
          {settlement.byMember.map((b) => (
            <BalanceRow key={b.memberId} balance={b} currency={trip.currency} />
          ))}
        </View>
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="overline" tone="subtle">
          Settle up
        </Text>
        {settlement.transfers.length === 0 ? (
          <Card padded variant="flat">
            <Text variant="bodyMedium" align="center">
              Everyone&apos;s even. Nothing to transfer. 🎉
            </Text>
          </Card>
        ) : (
          <View style={{ gap: theme.spacing.sm }}>
            {settlement.transfers.map((t, i) => (
              <TransferRow
                key={`${t.fromId}-${t.toId}-${i}`}
                from={t.fromName}
                to={t.toName}
                amount={t.amount}
                currency={trip.currency}
              />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
```

- [ ] **Step 4: Type-check and lint**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: both pass.

- [ ] **Step 5: Manual check**

In the running app:

- Trip with only "everyone" expenses: TotalsHero subtitle reads "Split evenly across N people"; Summary tab "Each person's share" shows the equal share amount.
- Add a partial expense to that trip: TotalsHero subtitle changes to "Across N people · some custom splits"; Summary tab's big number becomes "Varies" with the explanatory caption.
- Delete the partial expense: both surfaces revert to the equal-share labels.

- [ ] **Step 6: Commit**

```bash
git add app/trip/[id].tsx
git commit -m "Relabel per-person summary when trip has partial splits"
```

---

## Task 7: Full manual QA walkthrough

**Files:** None — verification only.

- [ ] **Step 1: Run through every scenario from the spec's Testing section**

Open the app via `pnpm start` and walk through each. For each: confirm the *actual* observed behavior matches "Expected." If anything diverges, stop, identify which task introduced the regression, and fix.

| # | Scenario | Expected |
|---|---|---|
| 1 | New expense, toggle off, deselect one member of 3 (Alex/Sam/Jo). Amount Rs 300. | Settlement charges only the 2 selected members; payer's `spent` is the full Rs 300; per-share is Rs 150 in selected members' `owed`. |
| 2 | New expense, toggle off, deselect everyone. | Save is disabled; helper reads "Pick at least one person to split with" in negative tone. |
| 3 | New expense, toggle off, deselect the payer too (payer pays but doesn't consume). | Settlement charges only the remaining selected members; payer's balance reflects spend − 0 owed (a creditor for the full amount on this expense). |
| 4 | Edit an existing "split with everyone" expense. | Toggle stays on; saving without changes preserves `splitWith === undefined` (re-edit confirms no chip state). |
| 5 | Edit an existing partial expense. | Toggle is off; chips hydrated from the saved set. |
| 6 | On a trip with one partial and one "everyone" expense, add a new member via Manage People. | The "everyone" expense's share recomputes including the new member; the partial expense is unchanged (new member owes nothing for it). |
| 7 | Remove a member who appears in a partial expense's `splitWith` but isn't its payer. | Removal succeeds. Expense's `splitWith` no longer includes them; the share for remaining selected members increases. |
| 8 | Remove a member who was the only one in a partial expense's `splitWith`. | Expense reverts to "split with everyone." `ExpenseRow` no longer shows the "Split with …" subtitle. |
| 9 | Settled trip: confirm the read-only flow still works (no regression to existing UI). | Trip detail still shows the settled pill; FAB hidden. |
| 10 | Compare tab: trip totals reflect raw spend, not per-person. | Numbers match `sum(expense.amount)` — unaffected by partial splits. |

- [ ] **Step 2: Final type-check, lint, and clean working tree**

```bash
pnpm exec tsc --noEmit
pnpm lint
git status
```

Expected: type-check passes, lint passes, working tree clean (or only contains unrelated pre-existing changes to `app.json`, `eas.json`, `package.json`, `pnpm-lock.yaml`).

- [ ] **Step 3: No commit**

Nothing to commit — this task is verification only.

---

## Self-Review

**Spec coverage:**
- Data model (`splitWith?: string[]`) — Task 1.
- Settlement math (per-expense effective share set, edge cases) — Task 2.
- `Settlement.perPerson` kept for backward compat — Task 2.
- Member removal stripping `splitWith` — Task 3 step 2.
- Form UX (toggle, chips pre-selected, helper line, save guard, edit hydration, persist-when-all-selected) — Task 4.
- `ExpenseRow` subtitle — Task 5.
- Trip detail "per-person" surfaces (the open question from the spec) — Task 6, locked to "Varies" text plus subtitle. The `TotalsHero` subtitle gets the parallel treatment.
- Compare tab unaffected — verified during research, called out in Task 7 QA.
- No test runner — verification via tsc + lint + manual scenarios from the spec.

**Placeholder scan:** No TBD/TODO/"similar to". Every code step shows the actual code.

**Type consistency:** `effectiveShareSet`, `hasPartialSplits`, `splitWith` field, `selectedSplitIds` are referenced consistently across tasks. `Set<string>` is used for in-form state and converted to `string[]` on save via `Array.from`. The `if (!expense.splitWith)` check in `effectiveShareSet` handles both `undefined` and `null` (relevant after JSON round-trip).

**Scope:** Single focused feature. No unrelated refactors.
