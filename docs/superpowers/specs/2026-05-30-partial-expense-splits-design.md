# Partial Expense Splits — Design

**Date:** 2026-05-30
**Status:** Approved, ready for implementation plan

## Problem

Every expense in Baraabar is currently split equally among **all** trip members. Real trips have cases where an expense only belongs to a subset — e.g. one person paid Rs 1,500 for lunch but only 3 of 5 members ate. Today there's no way to record that, so users either inflate the trip's totals or skip recording the expense.

## Goal

Let users mark an expense as split among a subset of members. The default flow (split among everyone) must remain unchanged in number of taps and visual weight — partial splits are a secondary mode.

## Non-goals

- Unequal / percentage / share-based splits ("Alex pays double, Sam pays once").
- Per-item itemization within one expense.
- Adding tax/tip allocations.
- Any concept beyond a member set (no "guest" members, no weights).

## Data model

Add one optional field to `Expense` in `types/models.ts`:

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
  splitWith?: string[]; // member ids; undefined = split among all current members
}
```

### Why optional (`undefined` = everyone) instead of always populating the array

- **Backward compatibility:** existing persisted expenses have no `splitWith` field; they continue to behave as "split among everyone" with no migration.
- **Dynamic membership semantics:** an expense saved with `splitWith === undefined` continues to track the *current* member list. If a new member joins the trip after the expense was recorded, they're automatically included in the per-person share. This matches today's behavior. A required array would freeze the member list at creation and silently exclude later joiners.
- **Smaller, cleaner persisted payloads** for the common case.

### Invariants

- If `splitWith` is set, it MUST contain at least one valid member id.
- `payerId` is **not** required to be in `splitWith` (case: A pays for B, C, D but didn't consume).
- `splitWith` MAY contain ids that no longer exist in `trip.members` (stale entries from member removal); the settlement layer filters these out at calc time.

## Settlement math (`lib/settle.ts`)

`calculateSettlement` currently divides each expense by `trip.members.length` and adds an equal share to every member's "owed" total. The change:

For each expense, compute the **effective share set**:

```ts
const allIds = trip.members.map(m => m.id);
const raw = expense.splitWith ?? allIds;
const shareSet = raw.filter(id => allIds.includes(id)); // drop stale ids
const effective = shareSet.length > 0 ? shareSet : allIds; // empty -> fall back to everyone
```

Then `perPerson = expense.amount / effective.length`, charged only to members in `effective`. Payer's `spent` is unchanged (still the full amount).

`MemberBalance.balance = roundCents(spent - owed)` where `owed` is the sum of per-expense shares the member actually owes. The greedy creditor/debtor transfer algorithm in `computeTransfers` is unchanged — it still operates on balances.

**`Settlement.perPerson`** (the trip-level "per person" number) is no longer meaningful when expenses have mixed share sets. Keep the field for backward compatibility but compute it as `totalSpent / memberCount` (today's formula) and let consumers decide whether to display it. The Compare tab and any per-person summary that needs accuracy should derive from `byMember[].balance` and `byMember[].spent` instead.

### Edge cases

| Case | Behavior |
|---|---|
| `splitWith === undefined` | Split among all current members (today's behavior). |
| `splitWith === []` | Defensive fallback: split among all current members. Form prevents creating this. |
| `splitWith` contains stale ids | Filter against current members; if result is empty, fall back to everyone. |
| All members in `splitWith` removed since creation | Same as above — falls back to everyone. |

## Member removal (`storage/tripsStore.ts → removeMember`)

Current logic: blocks removal if the member is a payer on any expense; otherwise removes them.

New behavior, applied in the same `tripsStore.set` update that removes the member:

1. Keep the existing payer check (still blocks removal).
2. For every expense in `expensesStoreFor(tripId)`:
   - If `splitWith` is defined and includes the removed id, strip the id.
   - If `splitWith` becomes `[]` after stripping, **delete the field** so the expense reverts to "everyone."

This cleanup runs as a single batched update on the expense store. We do not block member removal based on `splitWith` membership — the expense survives, it just no longer charges the removed member.

## Form UX — `components/ExpenseForm.tsx`

Add a section below the existing fields (Amount / Paid by / Category / Note), above the Save button:

### Default (toggle on)

```
Split equally with everyone   ●━━
```

Identical share calculation and identical persisted payload to today. No `splitWith` is set.

### Toggle off — reveal selector

```
Split equally with everyone   ━━○
Who's splitting?
[✓ Alex] [✓ Sam] [  Jo  ]
[  Pat ] [✓ Lee]
3 of 5 splitting · Rs 500 each
```

Behavior:

- Chips are a wrap-grid of all `trip.members`, **all pre-selected** when the toggle flips from on→off. Rationale: most partial splits are "everyone except 1–2," so starting from "all" minimizes taps.
- Tapping a chip toggles its selection. Payer's chip is selectable like any other (no special pinning).
- Live helper line:
  - Format: `"{N} of {M} splitting · {currency} {perShare} each"`.
  - `perShare` recomputes from the current `amount` field and the selected count; uses the same `formatAmount` helper.
  - If `amount` is empty or invalid, helper reads `"{N} of {M} splitting"`.
  - If `N === M` while toggle is off, helper still reads "M of M splitting" (no auto-flip back to "everyone" — let the user explicitly flip the toggle).
- Save button is disabled (and not haptic-tappable) when:
  - Toggle is off AND selected count is 0.
  - (Existing disabled conditions still apply: empty amount, etc.)
- Toggle on→off: select all members.
- Toggle off→on: clear selection state (returns to `splitWith === undefined` on save). Re-toggling off restores "all selected" again.

### Edit mode

When opening an existing expense:

- `splitWith === undefined` → toggle on, no chip state.
- `splitWith` is defined → toggle off, chips pre-selected from `splitWith` (filtered against current `trip.members` to drop stale ids).

### Persist payload

On save:

- Toggle on → omit `splitWith` from the patch (and unset it on existing expenses being edited from partial → everyone).
- Toggle off → write `splitWith: selectedIds`. If `selectedIds.length === trip.members.length` and contains every current member, we still persist the array (the user explicitly chose this state; they may add a member later and want the expense to *not* include them).

## Surfacing partial splits — `components/ExpenseRow.tsx`

When `expense.splitWith` is set, add a single subtitle line below the existing row content:

- Format: `"Split with Alex, Sam +1"` — show up to 2 names, then `+N` for the rest.
- Names come from `trip.members`; stale ids (not in current members) are omitted from the displayed list but still counted in `+N`. If 0 valid names remain, show `"Split with —"`.
- Uses `theme.typography.caption` and `theme.colors.textMuted`. No icon.

When `splitWith` is `undefined`, no subtitle line — common case stays visually identical to today.

`ExpenseRow` does not currently receive `trip.members`; the parent that renders the list (`app/trip/[id].tsx` and the recent-expenses list on the trips index) will need to pass member names in (either the full `members` array or a pre-built `Record<id, name>` lookup). Prefer passing the lookup map to avoid each row re-deriving it.

## Surfacing in other screens

- **Trip detail / per-member balances:** no UI change; the corrected settlement math flows through.
- **Compare tab (`app/(tabs)/compare.tsx`):** no UI change. Numbers derive from `byMember`, which is now correct.
- **Trip summary "per person" number** (if displayed): re-source it. If today it reads `settlement.perPerson` and there are any partial expenses in the trip, the value is misleading. Either:
  - Drop that summary when *any* expense in the trip has `splitWith` set, OR
  - Replace it with `"Spend per person varies"` text.
  Pick during implementation based on what the screen looks like — defer to whichever reads cleaner.

## Component touch list

| File | Change |
|---|---|
| `types/models.ts` | Add `splitWith?: string[]` to `Expense`. |
| `lib/settle.ts` | Per-expense effective share set; update `calculateSettlement`. |
| `storage/tripsStore.ts` | `addExpense` / `updateExpense` accept `splitWith`; `removeMember` strips removed id from all expenses' `splitWith`. |
| `components/ExpenseForm.tsx` | Toggle + chip selector + live helper + save guard + edit-mode hydration. |
| `components/ExpenseRow.tsx` | Optional "Split with …" subtitle; accept member-name lookup prop. |
| `app/trip/[id].tsx` | Pass member-name lookup to `ExpenseRow`. |
| `app/(tabs)/index.tsx` (recent expenses, if shown there) | Same — pass member-name lookup. |
| `app/(tabs)/compare.tsx` | Re-source any "per person" number if currently using `settlement.perPerson`. |

## Testing

No test runner is configured in this repo (per CLAUDE.md). Verification is manual:

- New expense, toggle off, deselect one member → settlement charges only the selected members; payer's spent is the full amount.
- New expense, toggle off, deselect everyone → Save is disabled.
- New expense, toggle off, deselect the payer too → settlement charges only the remaining selected members; payer's balance reflects spend − 0 owed.
- Edit existing "split with everyone" expense → toggle stays on; saving without changes keeps `splitWith` undefined.
- Edit existing partial expense → toggle is off, chips hydrated from saved set.
- Add a new member to a trip with one partial and one "everyone" expense → new member shares the "everyone" expense, owes nothing for the partial.
- Remove a member who appears in a partial expense's `splitWith` but isn't its payer → removal succeeds, expense's `splitWith` no longer contains them, share for remaining selected members goes up.
- Remove a member who is the only one in a partial expense's `splitWith` → expense reverts to "split with everyone."

## Open question deferred to implementation

The trip summary "per person" number behavior — whether to hide it or replace it with text when partial expenses exist — depends on layout that's easiest to judge in code. Implementation plan should call this out as a sub-step with a screenshot/decision before merging.
