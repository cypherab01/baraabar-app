import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { AppHeader } from "@/components/AppHeader";
import { BarChart, type BarChartDatum } from "@/components/BarChart";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { useAllExpenses } from "@/hooks/useAllExpenses";
import { useCategories } from "@/hooks/useCategories";
import { usePersons } from "@/hooks/usePersons";
import { useTrips } from "@/hooks/useTrips";
import { formatAmount, formatAmountCompact } from "@/lib/format";
import { calculateSettlement } from "@/lib/settle";
import { useTheme, type Theme } from "@/theme";

type CompareMode = "categories" | "people" | "trips";

const MODES: { value: CompareMode; label: string }[] = [
  { value: "categories", label: "Categories" },
  { value: "people", label: "People" },
  { value: "trips", label: "Trips" },
];

export default function CompareScreen() {
  const theme = useTheme();
  const trips = useTrips();
  const expensesByTrip = useAllExpenses(trips);
  const categories = useCategories();
  const persons = usePersons();
  const [mode, setMode] = useState<CompareMode>("categories");

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

  const { overallTotal, categoryTotals } = useMemo(() => {
    let total = 0;
    const byCategory = new Map<string, number>();
    for (const t of trips) {
      const expenses = expensesByTrip[t.id] ?? [];
      for (const e of expenses) {
        total += e.amount;
        byCategory.set(
          e.categoryId,
          (byCategory.get(e.categoryId) ?? 0) + e.amount,
        );
      }
    }
    return { overallTotal: total, categoryTotals: byCategory };
  }, [trips, expensesByTrip]);

  const averagePerTrip = trips.length > 0 ? overallTotal / trips.length : 0;

  // Categories view
  const categoryChartData: BarChartDatum[] = useMemo(
    () =>
      categories
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
        .sort((a, b) => b.value - a.value),
    [categories, categoryTotals, overallTotal, dominantCurrency],
  );

  // People view — per-person totals via settlement output so partial splits
  // correctly attribute share to participants only.
  const personChartData: BarChartDatum[] = useMemo(() => {
    const shareSum = new Map<string, number>();
    const paidSum = new Map<string, number>();
    const tripCount = new Map<string, number>();
    for (const trip of trips) {
      const expenses = expensesByTrip[trip.id] ?? [];
      if (expenses.length === 0) continue;
      const settlement = calculateSettlement(trip, expenses);
      const personByMember = new Map(
        trip.members.map((m) => [m.id, m.personId]),
      );
      const seen = new Set<string>();
      for (const bal of settlement.byMember) {
        const pid = personByMember.get(bal.memberId);
        if (!pid) continue;
        const share = bal.spent - bal.balance; // their effective share
        shareSum.set(pid, (shareSum.get(pid) ?? 0) + share);
        paidSum.set(pid, (paidSum.get(pid) ?? 0) + bal.spent);
        if (!seen.has(pid)) {
          tripCount.set(pid, (tripCount.get(pid) ?? 0) + 1);
          seen.add(pid);
        }
      }
    }
    return persons
      .map((p) => {
        const share = shareSum.get(p.id) ?? 0;
        const paid = paidSum.get(p.id) ?? 0;
        const tripsIn = tripCount.get(p.id) ?? 0;
        const net = paid - share;
        const netText =
          Math.abs(net) > 0.01
            ? ` · ${net > 0 ? "+" : "−"}${formatAmountCompact(Math.abs(net), dominantCurrency)} net`
            : "";
        return {
          key: p.id,
          label: p.name,
          value: share,
          formattedValue:
            share > 0 ? formatAmountCompact(share, dominantCurrency) : "—",
          caption:
            tripsIn === 0
              ? "No trips yet"
              : `${tripsIn} trip${tripsIn === 1 ? "" : "s"} · paid ${formatAmountCompact(paid, dominantCurrency)}${netText}`,
        };
      })
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [trips, expensesByTrip, persons, dominantCurrency]);

  // Trips view — stacked bars
  const stackPalette = useMemo(
    () => [
      theme.colors.accent,
      theme.colors.positive,
      theme.colors.warning,
      theme.colors.negative,
    ],
    [theme],
  );

  const categoryColorById = useMemo(() => {
    const sorted = [...categoryTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, stackPalette.length);
    const map = new Map<string, string>();
    sorted.forEach(([id], i) => {
      const color = stackPalette[i];
      if (color) map.set(id, color);
    });
    return map;
  }, [categoryTotals, stackPalette]);

  const otherColor = theme.colors.textSubtle;

  const tripStacks = useMemo(() => {
    const arr = trips.map((t) => {
      const expenses = expensesByTrip[t.id] ?? [];
      const byCat = new Map<string, number>();
      for (const e of expenses) {
        byCat.set(e.categoryId, (byCat.get(e.categoryId) ?? 0) + e.amount);
      }
      const segments = [...byCat.entries()]
        .map(([catId, amount]) => ({ catId, amount }))
        .sort((a, b) => b.amount - a.amount);
      const total = segments.reduce((s, seg) => s + seg.amount, 0);
      return { trip: t, segments, total };
    });
    arr.sort((a, b) => b.total - a.total);
    return arr;
  }, [trips, expensesByTrip]);

  const stackLegend = useMemo(() => {
    const items: { id: string; label: string; emoji: string; color: string }[] = [];
    for (const [id, color] of categoryColorById) {
      const cat = categories.find((c) => c.id === id);
      items.push({
        id,
        label: cat?.label ?? "Unknown",
        emoji: cat?.emoji ?? "•",
        color,
      });
    }
    return items;
  }, [categoryColorById, categories]);

  const hasOtherInStacks = useMemo(
    () =>
      tripStacks.some((s) =>
        s.segments.some((seg) => !categoryColorById.has(seg.catId)),
      ),
    [tripStacks, categoryColorById],
  );

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
            Compare by
          </Text>
          <Segmented value={mode} options={MODES} onChange={setMode} />
        </View>

        {mode === "categories" ? (
          <Card padded>
            {categoryChartData.length === 0 ? (
              <Text variant="body" tone="muted" align="center">
                Log an expense to see the breakdown.
              </Text>
            ) : (
              <BarChart data={categoryChartData} />
            )}
          </Card>
        ) : null}

        {mode === "people" ? (
          <Card padded>
            {personChartData.length === 0 ? (
              <Text variant="body" tone="muted" align="center">
                Once people in your trips have expenses, their spend lands
                here.
              </Text>
            ) : (
              <BarChart data={personChartData} />
            )}
          </Card>
        ) : null}

        {mode === "trips" ? (
          <Card padded>
            {tripStacks.every((s) => s.total === 0) ? (
              <Text variant="body" tone="muted" align="center">
                Log an expense in a trip to see the stack.
              </Text>
            ) : (
              <>
                {stackLegend.length > 0 ? (
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      rowGap: 6,
                      columnGap: 12,
                      marginBottom: theme.spacing.md,
                    }}
                  >
                    {stackLegend.map((leg) => (
                      <LegendChip
                        key={leg.id}
                        color={leg.color}
                        label={`${leg.emoji} ${leg.label}`}
                      />
                    ))}
                    {hasOtherInStacks ? (
                      <LegendChip color={otherColor} label="Other" />
                    ) : null}
                  </View>
                ) : null}
                <View style={{ gap: theme.spacing.md }}>
                  {tripStacks.map((s) => (
                    <StackedBar
                      key={s.trip.id}
                      name={s.trip.name}
                      total={s.total}
                      max={overallTotal}
                      currency={s.trip.currency}
                      segments={s.segments}
                      colorFor={(catId) =>
                        categoryColorById.get(catId) ?? otherColor
                      }
                      theme={theme}
                    />
                  ))}
                </View>
              </>
            )}
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function Segmented({
  value,
  options,
  onChange,
}: {
  value: CompareMode;
  options: { value: CompareMode; label: string }[];
  onChange: (v: CompareMode) => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        padding: 4,
        gap: 4,
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: theme.radii.md,
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: theme.radii.sm,
              alignItems: "center",
              backgroundColor: active
                ? theme.colors.bgElevated
                : "transparent",
            }}
          >
            <Text
              variant="bodyMedium"
              style={{
                color: active ? theme.colors.text : theme.colors.textMuted,
                fontFamily: active ? "Inter_600SemiBold" : "Inter_500Medium",
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function LegendChip({ color, label }: { color: string; label: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
      }}
    >
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: color,
        }}
      />
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  );
}

function StackedBar({
  name,
  total,
  max,
  currency,
  segments,
  colorFor,
  theme,
}: {
  name: string;
  total: number;
  max: number;
  currency: string;
  segments: { catId: string; amount: number }[];
  colorFor: (catId: string) => string;
  theme: Theme;
}) {
  const pct = max > 0 ? total / max : 0;
  const segmentTotal = segments.reduce((s, seg) => s + seg.amount, 0);
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text variant="bodyMedium" style={{ flex: 1 }} numberOfLines={1}>
          {name}
        </Text>
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 14,
            color: theme.colors.text,
            fontVariant: ["tabular-nums"],
          }}
        >
          {total > 0 ? formatAmountCompact(total, currency) : "—"}
        </Text>
      </View>
      <View
        style={{
          height: 10,
          borderRadius: 5,
          backgroundColor: theme.colors.surfaceAlt,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            height: "100%",
            width: `${Math.max(0.02, pct) * 100}%`,
            borderRadius: 5,
            overflow: "hidden",
            flexDirection: "row",
          }}
        >
          {segmentTotal > 0
            ? segments.map((seg) => (
                <View
                  key={seg.catId}
                  style={{
                    height: "100%",
                    flex: seg.amount,
                    backgroundColor: colorFor(seg.catId),
                  }}
                />
              ))
            : null}
        </View>
      </View>
    </View>
  );
}
