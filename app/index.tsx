import { useRouter } from "expo-router";
import { SectionList, View } from "react-native";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { FAB } from "@/components/FAB";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { TripCard } from "@/components/TripCard";
import { useTrips } from "@/hooks/useTrips";
import { useTheme } from "@/theme";
import type { Trip } from "@/types/models";

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const trips = useTrips();
  const active = trips.filter((t) => !t.closedAt);
  const closed = trips.filter((t) => t.closedAt);

  const sections: { title: string; data: Trip[] }[] = [];
  if (active.length > 0) sections.push({ title: "Active", data: active });
  if (closed.length > 0) sections.push({ title: "Settled", data: closed });

  return (
    <Screen>
      <AppHeader
        title="Trips"
        subtitle={
          trips.length === 0
            ? "Start a new trip to begin splitting"
            : `${active.length} active · ${closed.length} settled`
        }
      />

      {trips.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <EmptyState
            emoji="🧳"
            title="No trips yet"
            description="Create a trip, add the people you're sharing expenses with, and we'll handle the math."
            action={
              <Button
                label="New trip"
                size="lg"
                onPress={() => router.push("/trip/new" as never)}
              />
            }
          />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => (
            <View style={{ marginBottom: theme.spacing.md }}>
              <TripCard trip={item} />
            </View>
          )}
          renderSectionHeader={({ section }) =>
            sections.length > 1 ? (
              <Text
                variant="overline"
                tone="subtle"
                style={{
                  marginTop: theme.spacing.md,
                  marginBottom: theme.spacing.sm,
                }}
              >
                {section.title}
              </Text>
            ) : null
          }
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {trips.length > 0 ? (
        <FAB
          icon="add"
          onPress={() => router.push("/trip/new" as never)}
          accessibilityLabel="New trip"
        />
      ) : null}
    </Screen>
  );
}
