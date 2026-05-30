import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Alert, Pressable, TextInput, View } from "react-native";
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
} from "react-native-keyboard-controller";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { IconButton } from "@/components/IconButton";
import { MemberAvatar } from "@/components/MemberAvatar";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { TextField } from "@/components/TextField";
import { useExpenses, useTrip } from "@/hooks/useTrips";
import { findOrCreatePerson } from "@/storage/personsStore";
import { addMember, removeMember } from "@/storage/tripsStore";
import { useTheme } from "@/theme";

export default function MembersScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const trip = useTrip(id);
  const expenses = useExpenses(id);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | undefined>();
  const inputRef = useRef<TextInput>(null);

  if (!trip) {
    return (
      <Screen>
        <AppHeader title="People" showBack />
        <EmptyState emoji="🔍" title="Trip not found" />
      </Screen>
    );
  }

  const expenseCountByMember = expenses.reduce<Record<string, number>>(
    (acc, e) => {
      acc[e.payerId] = (acc[e.payerId] ?? 0) + 1;
      return acc;
    },
    {},
  );

  const handleAdd = () => {
    const name = draft.trim();
    if (!name) {
      setError("Enter a name");
      return;
    }
    if (
      trip.members.some(
        (m) => m.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      setError("Someone with that name is already on this trip");
      return;
    }
    const person = findOrCreatePerson(name);
    addMember(trip.id, name, person.id);
    setDraft("");
    setError(undefined);
    Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success,
    ).catch(() => {});
    inputRef.current?.focus();
  };

  const handleRemove = (memberId: string, name: string) => {
    if (trip.members.length <= 2) {
      Alert.alert("Can't remove", "A trip needs at least two people.");
      return;
    }
    if ((expenseCountByMember[memberId] ?? 0) > 0) {
      Alert.alert(
        "Can't remove",
        `${name} has already paid for an expense. Delete those expenses first to remove them.`,
      );
      return;
    }
    Alert.alert("Remove person", `Remove ${name} from this trip?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          removeMember(trip.id, memberId);
        },
      },
    ]);
  };

  return (
    <Screen edges={["top", "left", "right", "bottom"]}>
      <AppHeader
        title="People on this trip"
        subtitle={`${trip.members.length} ${trip.members.length === 1 ? "person" : "people"}`}
        trailing={
          <IconButton variant="soft" size={40} onPress={() => router.back()}>
            <Ionicons name="close" size={20} color={theme.colors.text} />
          </IconButton>
        }
      />

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: theme.spacing["4xl"],
          gap: theme.spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
      >
        <Card padded={false} style={{ padding: theme.spacing.sm }}>
          {trip.members.map((m, i) => {
            const count = expenseCountByMember[m.id] ?? 0;
            return (
              <View
                key={m.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: theme.spacing.md,
                  paddingVertical: theme.spacing.md,
                  paddingHorizontal: theme.spacing.md,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: theme.colors.border,
                }}
              >
                <MemberAvatar name={m.name} size={40} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium">{m.name}</Text>
                  <Text variant="caption" tone="muted">
                    {count === 0
                      ? "No expenses yet"
                      : `${count} expense${count === 1 ? "" : "s"}`}
                  </Text>
                </View>
                <IconButton
                  size={36}
                  variant="flat"
                  onPress={() => handleRemove(m.id, m.name)}
                  accessibilityLabel={`Remove ${m.name}`}
                >
                  <Ionicons
                    name="close"
                    size={18}
                    color={theme.colors.textMuted}
                  />
                </IconButton>
              </View>
            );
          })}
        </Card>

        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="label" tone="muted">
            Add someone who joined later
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: theme.spacing.sm,
            }}
          >
            <View style={{ flex: 1 }}>
              <TextField
                ref={inputRef}
                placeholder="Name"
                value={draft}
                onChangeText={(v) => {
                  setDraft(v);
                  if (error) setError(undefined);
                }}
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={30}
                returnKeyType="done"
                onSubmitEditing={handleAdd}
                error={error}
              />
            </View>
            <Pressable
              onPress={handleAdd}
              android_ripple={{ color: "rgba(255,255,255,0.15)" }}
              style={({ pressed }) => ({
                height: 48,
                paddingHorizontal: 18,
                borderRadius: theme.radii.md,
                backgroundColor: theme.colors.accent,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 6,
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <Ionicons
                name="add"
                size={18}
                color={theme.colors.accentText}
              />
              <Text
                style={{
                  color: theme.colors.accentText,
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 15,
                }}
              >
                Add
              </Text>
            </Pressable>
          </View>
          <Text variant="caption" tone="subtle">
            New people start at ₀. Existing expenses aren&apos;t rebalanced automatically.
          </Text>
        </View>
      </KeyboardAwareScrollView>

      <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
        <View
          style={{
            paddingVertical: theme.spacing.md,
            backgroundColor: theme.colors.bg,
          }}
        >
          <Button label="Done" size="lg" block onPress={() => router.back()} />
        </View>
      </KeyboardStickyView>
    </Screen>
  );
}
