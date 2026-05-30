import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, ScrollView, View } from "react-native";
import { ActionSheet } from "@/components/ActionSheet";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { ExpenseRow } from "@/components/ExpenseRow";
import { FAB } from "@/components/FAB";
import { IconButton } from "@/components/IconButton";
import { MemberAvatar } from "@/components/MemberAvatar";
import { Pill } from "@/components/Pill";
import { Screen } from "@/components/Screen";
import { SegmentedControl } from "@/components/SegmentedControl";
import { Text } from "@/components/Text";
import { useExpenses, useTrip } from "@/hooks/useTrips";
import { formatAmount, formatDayLabel } from "@/lib/format";
import { calculateSettlement, hasPartialSplits, type MemberBalance } from "@/lib/settle";
import {
  closeTrip,
  deleteExpense,
  deleteTrip,
  reopenTrip,
} from "@/storage/tripsStore";
import { useTheme } from "@/theme";
import { CURRENCY_OPTIONS, type Expense, type Trip } from "@/types/models";

type Tab = "live" | "summary";

export default function TripDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const trip = useTrip(id);
  const expenses = useExpenses(id);
  const [tab, setTab] = useState<Tab>("live");
  const [menuOpen, setMenuOpen] = useState(false);

  const settlement = useMemo(
    () => (trip ? calculateSettlement(trip, expenses) : null),
    [trip, expenses],
  );

  const anyPartial = useMemo(() => hasPartialSplits(expenses), [expenses]);

  if (!trip) {
    return (
      <Screen>
        <AppHeader showBack title="Trip" />
        <EmptyState
          emoji="🔍"
          title="Trip not found"
          description="This trip might have been deleted."
          action={<Button label="Back home" onPress={() => router.replace("/")}/>}
        />
      </Screen>
    );
  }

  const isClosed = Boolean(trip.closedAt);
  const currencyMeta = CURRENCY_OPTIONS.find((c) => c.code === trip.currency);

  const menuOptions = [
    {
      key: "members",
      label: "Manage people",
      description: "Add someone who joined later, or remove a person",
      icon: "people-outline" as const,
      onPress: () => router.push(`/trip/${trip.id}/members` as never),
    },
    isClosed
      ? {
          key: "reopen",
          label: "Reopen trip",
          description: "Continue logging expenses",
          icon: "lock-open-outline" as const,
          onPress: () => reopenTrip(trip.id),
        }
      : {
          key: "settle",
          label: "Mark as settled",
          description: "Lock the trip after settling up",
          icon: "checkmark-circle-outline" as const,
          onPress: () => {
            closeTrip(trip.id);
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success,
            ).catch(() => {});
          },
        },
    {
      key: "delete",
      label: "Delete trip",
      description: "Permanently remove the trip and all expenses",
      icon: "trash-outline" as const,
      destructive: true,
      onPress: () => {
        Alert.alert(
          "Delete trip",
          "This will remove the trip and all its expenses. This cannot be undone.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: async () => {
                await deleteTrip(trip.id);
                router.replace("/");
              },
            },
          ],
        );
      },
    },
  ];

  return (
    <Screen edges={["top", "left", "right"]}>
      <AppHeader
        showBack
        title={trip.name}
        subtitle={`${trip.members.length} people · ${currencyMeta?.code ?? trip.currency}`}
        trailing={
          <IconButton
            size={40}
            variant="soft"
            onPress={() => setMenuOpen(true)}
            accessibilityLabel="Trip options"
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={20}
              color={theme.colors.text}
            />
          </IconButton>
        }
      />

      <TotalsHero trip={trip} total={settlement?.totalSpent ?? 0} anyPartial={anyPartial} />

      <View style={{ marginTop: theme.spacing.lg }}>
        <SegmentedControl
          value={tab}
          onChange={setTab}
          segments={[
            { value: "live", label: "Live" },
            { value: "summary", label: "Summary" },
          ]}
        />
      </View>

      <View style={{ flex: 1, marginTop: theme.spacing.lg }}>
        {tab === "live" ? (
          <LiveTab
            trip={trip}
            expenses={expenses}
            memberSpent={settlement?.byMember ?? []}
            onEditExpense={(e) =>
              router.push(
                `/trip/${trip.id}/expense/${e.id}` as never,
              )
            }
            onDeleteExpense={(e) => {
              Alert.alert("Delete expense", "Remove this expense?", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: () => deleteExpense(trip.id, e.id),
                },
              ]);
            }}
          />
        ) : (
          <SummaryTab trip={trip} settlement={settlement!} anyPartial={anyPartial} />
        )}
      </View>

      {isClosed ? (
        <View style={{ paddingVertical: theme.spacing.md }}>
          <Pill label="Trip settled · read-only" tone="positive" />
        </View>
      ) : null}

      {tab === "live" && !isClosed ? (
        <FAB
          icon="add"
          label="Add expense"
          size="lg"
          onPress={() =>
            router.push(`/trip/${trip.id}/expense/new` as never)
          }
          accessibilityLabel="Add expense"
        />
      ) : null}

      <ActionSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={trip.name}
        message={`${trip.members.length} people · ${expenses.length} expense${expenses.length === 1 ? "" : "s"}`}
        options={menuOptions}
      />
    </Screen>
  );
}

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

interface LiveTabProps {
  trip: Trip;
  expenses: Expense[];
  memberSpent: MemberBalance[];
  onEditExpense: (e: Expense) => void;
  onDeleteExpense: (e: Expense) => void;
}

function LiveTab({
  trip,
  expenses,
  memberSpent,
  onEditExpense,
  onDeleteExpense,
}: LiveTabProps) {
  const theme = useTheme();

  const grouped = useMemo(() => {
    const groups = new Map<string, Expense[]>();
    for (const e of expenses) {
      const d = new Date(e.createdAt);
      const key = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
      ).getTime();
      const arr = groups.get(String(key)) ?? [];
      arr.push(e);
      groups.set(String(key), arr);
    }
    return Array.from(groups.entries())
      .map(([k, list]) => ({
        dayTs: Number(k),
        expenses: list.sort((a, b) => b.createdAt - a.createdAt),
      }))
      .sort((a, b) => b.dayTs - a.dayTs);
  }, [expenses]);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      <View style={{ marginBottom: theme.spacing.lg, gap: theme.spacing.sm }}>
        <Text variant="overline" tone="subtle">
          Paid by person
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingRight: 8 }}
        >
          {memberSpent.map((m) => (
            <MemberSpendPill
              key={m.memberId}
              name={m.memberName}
              amount={m.spent}
              currency={trip.currency}
            />
          ))}
        </ScrollView>
      </View>

      {expenses.length === 0 ? (
        <EmptyState
          emoji="🧾"
          title="No expenses yet"
          description="Tap 'Add expense' to log what someone paid for."
        />
      ) : (
        <View style={{ gap: theme.spacing.xl }}>
          {grouped.map((group) => (
            <View key={group.dayTs} style={{ gap: theme.spacing.sm }}>
              <Text
                variant="label"
                tone="muted"
                style={{ marginLeft: 4 }}
              >
                {formatDayLabel(group.dayTs)}
              </Text>
              <View style={{ gap: theme.spacing.sm }}>
                {group.expenses.map((e) => (
                  <ExpenseRow
                    key={e.id}
                    expense={e}
                    members={trip.members}
                    currency={trip.currency}
                    onPress={() => onEditExpense(e)}
                    onLongPress={() => onDeleteExpense(e)}
                  />
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function MemberSpendPill({
  name,
  amount,
  currency,
}: {
  name: string;
  amount: number;
  currency: string;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingRight: 12,
        paddingLeft: 4,
        paddingVertical: 4,
        borderRadius: theme.radii.pill,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      <MemberAvatar name={name} size={28} />
      <View>
        <Text variant="caption" tone="muted">
          {name}
        </Text>
        <Text
          style={{
            fontFamily: "Inter_600SemiBold",
            fontSize: 13,
            color: theme.colors.text,
            fontVariant: ["tabular-nums"],
          }}
        >
          {formatAmount(amount, currency)}
        </Text>
      </View>
    </View>
  );
}

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

function BalanceRow({
  balance,
  currency,
}: {
  balance: MemberBalance;
  currency: string;
}) {
  const theme = useTheme();
  const settled = Math.abs(balance.balance) < 0.01;
  const isCreditor = balance.balance > 0;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.md,
        padding: theme.spacing.md,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radii.lg,
        borderWidth: theme.scheme === "dark" ? 1 : 0,
        borderColor: theme.colors.border,
      }}
    >
      <MemberAvatar name={balance.memberName} size={40} />
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium">{balance.memberName}</Text>
        <Text variant="caption" tone="muted">
          Paid {formatAmount(balance.spent, currency)}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 15,
            color: settled
              ? theme.colors.textMuted
              : isCreditor
                ? theme.colors.positive
                : theme.colors.negative,
            fontVariant: ["tabular-nums"],
          }}
        >
          {settled
            ? "Settled"
            : isCreditor
              ? `+${formatAmount(balance.balance, currency)}`
              : formatAmount(balance.balance, currency)}
        </Text>
        <Text variant="caption" tone="subtle">
          {settled ? "no action" : isCreditor ? "is owed" : "owes"}
        </Text>
      </View>
    </View>
  );
}

function TransferRow({
  from,
  to,
  amount,
  currency,
}: {
  from: string;
  to: string;
  amount: number;
  currency: string;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.md,
        padding: theme.spacing.md,
        backgroundColor: theme.colors.accentSoft,
        borderRadius: theme.radii.lg,
      }}
    >
      <MemberAvatar name={from} size={36} />
      <View style={{ flex: 1 }}>
        <Text variant="bodyMedium">
          <Text style={{ fontFamily: "Inter_700Bold" }}>{from}</Text> pays{" "}
          <Text style={{ fontFamily: "Inter_700Bold" }}>{to}</Text>
        </Text>
      </View>
      <Ionicons
        name="arrow-forward"
        size={16}
        color={theme.colors.accent}
        style={{ marginRight: 4 }}
      />
      <MemberAvatar name={to} size={36} />
      <Text
        style={{
          fontFamily: "Inter_700Bold",
          fontSize: 15,
          marginLeft: 6,
          color: theme.colors.accent,
          fontVariant: ["tabular-nums"],
        }}
      >
        {formatAmount(amount, currency)}
      </Text>
    </View>
  );
}
