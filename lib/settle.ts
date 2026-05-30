import type { Expense, Trip } from "@/types/models";

export interface MemberBalance {
  memberId: string;
  memberName: string;
  spent: number;
  balance: number;
}

export interface Transfer {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}

export interface Settlement {
  totalSpent: number;
  perPerson: number;
  byMember: MemberBalance[];
  transfers: Transfer[];
}

const roundCents = (n: number) => Math.round(n * 100) / 100;

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

function computeTransfers(
  balances: MemberBalance[],
  nameFor: (id: string) => string,
): Transfer[] {
  const EPS = 0.01;
  const creditors = balances
    .filter((b) => b.balance > EPS)
    .map((b) => ({ id: b.memberId, amount: b.balance }))
    .sort((a, b) => b.amount - a.amount);
  const debtors = balances
    .filter((b) => b.balance < -EPS)
    .map((b) => ({ id: b.memberId, amount: -b.balance }))
    .sort((a, b) => b.amount - a.amount);

  const transfers: Transfer[] = [];
  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const c = creditors[ci]!;
    const d = debtors[di]!;
    const pay = Math.min(c.amount, d.amount);
    if (pay > EPS) {
      transfers.push({
        fromId: d.id,
        fromName: nameFor(d.id),
        toId: c.id,
        toName: nameFor(c.id),
        amount: roundCents(pay),
      });
    }
    c.amount = roundCents(c.amount - pay);
    d.amount = roundCents(d.amount - pay);
    if (c.amount <= EPS) ci++;
    if (d.amount <= EPS) di++;
  }
  return transfers;
}

export function hasPartialSplits(expenses: Expense[]): boolean {
  return expenses.some((e) => e.splitWith != null);
}
