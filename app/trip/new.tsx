import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { nanoid } from "nanoid/non-secure";
import { useState } from "react";
import { Pressable, View } from "react-native";
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
} from "react-native-keyboard-controller";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { IconButton } from "@/components/IconButton";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { TextField } from "@/components/TextField";
import { createTrip } from "@/storage/tripsStore";
import { useTheme } from "@/theme";

interface DraftMember {
  key: string;
  name: string;
}

const DEFAULT_CURRENCY = "NPR";

export default function NewTripScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [name, setName] = useState("");
  const [members, setMembers] = useState<DraftMember[]>([
    { key: nanoid(6), name: "" },
    { key: nanoid(6), name: "" },
  ]);
  const [submitted, setSubmitted] = useState(false);

  const trimmedMembers = members.map((m) => m.name.trim()).filter(Boolean);
  const nameError =
    submitted && !name.trim() ? "Give your trip a name" : undefined;
  const memberError =
    submitted && trimmedMembers.length < 2
      ? "Add at least two people"
      : undefined;

  const canSubmit = name.trim().length > 0 && trimmedMembers.length >= 2;

  const addMember = () => {
    setMembers((prev) => [...prev, { key: nanoid(6), name: "" }]);
  };

  const removeMember = (key: string) => {
    setMembers((prev) =>
      prev.length <= 2 ? prev : prev.filter((m) => m.key !== key),
    );
  };

  const updateMember = (key: string, value: string) => {
    setMembers((prev) =>
      prev.map((m) => (m.key === key ? { ...m, name: value } : m)),
    );
  };

  const handleCreate = () => {
    setSubmitted(true);
    if (!canSubmit) return;
    const trip = createTrip({
      name,
      currency: DEFAULT_CURRENCY,
      members: members.map((m) => ({ name: m.name })),
    });
    router.replace(`/trip/${trip.id}` as never);
  };

  return (
    <Screen>
      <AppHeader
        title="New trip"
        showBack
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
        <TextField
          label="Trip name"
          placeholder="e.g. Pokhara Weekend"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoCorrect={false}
          error={nameError}
          maxLength={60}
        />

        <Card padded>
          <View style={{ marginBottom: theme.spacing.md }}>
            <Text variant="subheading">People</Text>
            <Text variant="caption" tone="muted">
              Everyone splitting costs on this trip
            </Text>
          </View>

          <View style={{ gap: theme.spacing.sm }}>
            {members.map((m, i) => (
              <View
                key={m.key}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <View style={{ flex: 1 }}>
                  <TextField
                    placeholder={`Person ${i + 1}`}
                    value={m.name}
                    onChangeText={(v) => updateMember(m.key, v)}
                    autoCapitalize="words"
                    autoCorrect={false}
                    maxLength={30}
                    returnKeyType={
                      i === members.length - 1 ? "done" : "next"
                    }
                  />
                </View>
                {members.length > 2 ? (
                  <IconButton
                    size={40}
                    variant="flat"
                    onPress={() => removeMember(m.key)}
                    accessibilityLabel={`Remove person ${i + 1}`}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={theme.colors.textMuted}
                    />
                  </IconButton>
                ) : null}
              </View>
            ))}
          </View>

          <Pressable
            onPress={addMember}
            android_ripple={{ color: theme.colors.accentSoft }}
            style={({ pressed }) => ({
              marginTop: theme.spacing.md,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 12,
              borderRadius: theme.radii.md,
              borderWidth: 1.5,
              borderStyle: "dashed",
              borderColor: pressed
                ? theme.colors.accent
                : theme.colors.borderStrong,
              backgroundColor: pressed
                ? theme.colors.accentSoft
                : "transparent",
            })}
            accessibilityRole="button"
            accessibilityLabel="Add another person"
          >
            <Ionicons
              name="person-add-outline"
              size={18}
              color={theme.colors.accent}
            />
            <Text
              style={{
                color: theme.colors.accent,
                fontFamily: "Inter_600SemiBold",
                fontSize: 14,
              }}
            >
              Add another person
            </Text>
          </Pressable>

          {memberError ? (
            <Text
              variant="caption"
              tone="negative"
              style={{ marginTop: theme.spacing.sm }}
            >
              {memberError}
            </Text>
          ) : null}
        </Card>
      </KeyboardAwareScrollView>

      <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
        <View
          style={{
            paddingVertical: theme.spacing.md,
            backgroundColor: theme.colors.bg,
          }}
        >
          <Button
            label="Create trip"
            size="lg"
            block
            onPress={handleCreate}
            disabled={submitted && !canSubmit}
          />
        </View>
      </KeyboardStickyView>
    </Screen>
  );
}
