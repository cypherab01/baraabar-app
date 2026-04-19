import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { nanoid } from "nanoid/non-secure";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { IconButton } from "@/components/IconButton";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { TextField } from "@/components/TextField";
import { createTrip } from "@/storage/tripsStore";
import { useTheme } from "@/theme";
import { CURRENCY_OPTIONS } from "@/types/models";

interface DraftMember {
  key: string;
  name: string;
}

export default function NewTripScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("NPR");
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

  const canSubmit =
    name.trim().length > 0 && trimmedMembers.length >= 2 && Boolean(currency);

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
      currency,
      memberNames: members.map((m) => m.name),
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={20}
      >
        <ScrollView
          contentContainerStyle={{
            paddingBottom: theme.spacing["4xl"],
            gap: theme.spacing.lg,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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

          <View style={{ gap: 8 }}>
            <Text variant="label" tone="muted">
              Currency
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingRight: 8 }}
            >
              {CURRENCY_OPTIONS.map((c) => {
                const active = c.code === currency;
                return (
                  <Pressable
                    key={c.code}
                    onPress={() => setCurrency(c.code)}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <View
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderRadius: theme.radii.pill,
                        backgroundColor: active
                          ? theme.colors.accent
                          : theme.colors.surface,
                        borderWidth: 1,
                        borderColor: active
                          ? theme.colors.accent
                          : theme.colors.border,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "Inter_700Bold",
                          color: active
                            ? theme.colors.accentText
                            : theme.colors.text,
                          fontSize: 15,
                        }}
                      >
                        {c.symbol}
                      </Text>
                      <Text
                        variant="label"
                        style={{
                          color: active
                            ? theme.colors.accentText
                            : theme.colors.textMuted,
                          fontFamily: "Inter_600SemiBold",
                        }}
                      >
                        {c.code}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <Card padded>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: theme.spacing.md,
              }}
            >
              <View>
                <Text variant="subheading">People</Text>
                <Text variant="caption" tone="muted">
                  Everyone splitting costs on this trip
                </Text>
              </View>
              <IconButton size={36} variant="soft" onPress={addMember}>
                <Ionicons
                  name="person-add-outline"
                  size={18}
                  color={theme.colors.text}
                />
              </IconButton>
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
        </ScrollView>

        <View style={{ paddingTop: theme.spacing.md }}>
          <Button
            label="Create trip"
            size="lg"
            block
            onPress={handleCreate}
            disabled={submitted && !canSubmit}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
