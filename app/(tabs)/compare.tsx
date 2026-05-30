import { useMemo } from "react";
import { ScrollView, View } from "react-native";
import { AppHeader } from "@/components/AppHeader";
import { BarChart, type BarChartDatum } from "@/components/BarChart";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { useAllExpenses } from "@/hooks/useAllExpenses";
import { useCategories } from "@/hooks/useCategories";
import { useTrips } from "@/hooks/useTrips";
import { formatAmount, formatAmountCompact } from "@/lib/format";
import { useTheme } from "@/theme";

export default function CompareScreen() {
  const theme = useTheme();
  const trips = useTrips();
  const expensesByTrip = useAllExpenses(trips);
  const categories = useCategories();

  const dominantCurrency = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of trips) {
      counts.set(t.currency, (counts.get(t.currency) ?? 0) + 1);
    }
    let best = "NPR";
    let bestCount = 0;
    for (const [c, n] of counts) {
      if (n > bestCount) {
        best = c;
        bestCount = n;
      }
    }
    return best;
  }, [trips]);

  const { tripStats, overallTotal, categoryTotals } = useMemo(() => {
    let total = 0;
    const byCategory = new Map<string, number>();
    const stats = trips.map((t) => {
      const expenses = expensesByTrip[t.id] ?? [];
      const tripTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
      total += tripTotal;
      for (const e of expenses) {
        byCategory.set(
          e.categoryId,
          (byCategory.get(e.categoryId) ?? 0) + e.amount,
        );
      }
      return {
        trip: t,
        total: tripTotal,
        expenseCount: expenses.length,
      };
    });
    stats.sort((a, b) => b.total - a.total);
    return {
      tripStats: stats,
      overallTotal: total,
      categoryTotals: byCategory,
    };
  }, [trips, expensesByTrip]);

  const averagePerTrip = trips.length > 0 ? overallTotal / trips.length : 0;

  const tripChartData: BarChartDatum[] = tripStats.map((s) => ({
    key: s.trip.id,
    label: s.trip.name,
    value: s.total,
    formattedValue: formatAmountCompact(s.total, s.trip.currency),
    caption:
      s.expenseCount === 0
        ? "No expenses yet"
        : `${s.expenseCount} expense${s.expenseCount === 1 ? "" : "s"} · ${s.trip.members.length} people`,
  }));

  const categoryChartData: BarChartDatum[] = categories
    .filter((c) => !c.archivedAt || categoryTotals.has(c.id))
    .map((c) => {
      const amount = categoryTotals.get(c.id) ?? 0;
      const share = overallTotal > 0 ? (amount / overallTotal) * 100 : 0;
      return {
        key: c.id,
        label: `${c.emoji} ${c.label}`,
        value: amount,
        formattedValue:
          amount > 0 ? formatAmountCompact(amount, dominantCurrency) : "—",
        caption: amount > 0 ? `${share.toFixed(0)}% of total` : undefined,
      };
    })
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  if (trips.length === 0) {
    return (
      <Screen edges={["top", "left", "right"]}>
        <AppHeader title="Compare" subtitle="See spending across trips" />
        <View style={{ flex: 1, justifyContent: "center" }}>
          <EmptyState
            emoji="📊"
            title="Nothing to compare yet"
            description="Create a couple of trips and log some expenses. Your spending breakdown shows up here."
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={["top", "left", "right"]}>
      <AppHeader
        title="Compare"
        subtitle={`${trips.length} trip${trips.length === 1 ? "" : "s"} tracked`}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: theme.spacing["4xl"],
          gap: theme.spacing.lg,
        }}
      >
        <Card padded>
          <Text variant="overline" tone="subtle">
            Overall
          </Text>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginTop: 6,
              gap: theme.spacing.md,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text variant="caption" tone="muted">
                Total spent
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  fontSize: 32,
                  lineHeight: 38,
                  letterSpacing: -0.5,
                  marginTop: 2,
                  color: theme.colors.text,
                  fontVariant: ["tabular-nums"],
                }}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatAmount(overallTotal, dominantCurrency)}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text variant="caption" tone="muted">
                Avg per trip
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 16,
                  marginTop: 2,
                  color: theme.colors.text,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {formatAmountCompact(averagePerTrip, dominantCurrency)}
              </Text>
            </View>
          </View>
        </Card>

        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="overline" tone="subtle">
            Trips by spending
          </Text>
          <Card padded>
            <BarChart data={tripChartData} />
          </Card>
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="overline" tone="subtle">
            Spending by category
          </Text>
          <Card padded>
            {categoryChartData.length === 0 ? (
              <Text variant="body" tone="muted" align="center">
                Log an expense to see the breakdown.
              </Text>
            ) : (
              <BarChart data={categoryChartData} />
            )}
          </Card>
        </View>
      </ScrollView>
    </Screen>
  );
}
