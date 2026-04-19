import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { useExpenses } from "@/hooks/useTrips";
import { formatAmountCompact, formatRelativeDate } from "@/lib/format";
import { useTheme } from "@/theme";
import type { Trip } from "@/types/models";
import { Card } from "./Card";
import { MemberAvatar } from "./MemberAvatar";
import { Pill } from "./Pill";
import { Text } from "./Text";

interface TripCardProps {
  trip: Trip;
}

export function TripCard({ trip }: TripCardProps) {
  const theme = useTheme();
  const router = useRouter();
  const expenses = useExpenses(trip.id);
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const isClosed = Boolean(trip.closedAt);

  return (
    <Pressable
      onPress={() => router.push(`/trip/${trip.id}` as never)}
      style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
    >
      <Card padded>
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: theme.spacing.md,
          }}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Text variant="heading" numberOfLines={1}>
                {trip.name}
              </Text>
              {isClosed ? <Pill label="Settled" tone="positive" size="sm" /> : null}
            </View>
            <Text variant="caption" tone="subtle">
              {formatRelativeDate(trip.createdAt)} · {trip.members.length} people ·{" "}
              {expenses.length} expense{expenses.length === 1 ? "" : "s"}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={theme.colors.textSubtle}
          />
        </View>

        <View
          style={{
            marginTop: theme.spacing.lg,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View>
            <Text variant="caption" tone="muted">
              Total spent
            </Text>
            <Text
              variant="title"
              style={{ fontFamily: "Inter_700Bold", marginTop: 2 }}
            >
              {formatAmountCompact(total, trip.currency)}
            </Text>
          </View>

          <View style={{ flexDirection: "row" }}>
            {trip.members.slice(0, 4).map((m, i) => (
              <View
                key={m.id}
                style={{
                  marginLeft: i === 0 ? 0 : -10,
                  borderWidth: 2,
                  borderColor: theme.colors.surface,
                  borderRadius: 999,
                }}
              >
                <MemberAvatar name={m.name} size={32} />
              </View>
            ))}
            {trip.members.length > 4 ? (
              <View
                style={{
                  marginLeft: -10,
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: theme.colors.surfaceAlt,
                  borderWidth: 2,
                  borderColor: theme.colors.surface,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  variant="caption"
                  style={{ fontFamily: "Inter_600SemiBold" }}
                >
                  +{trip.members.length - 4}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
