import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, View } from "react-native";
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
import { usePersons } from "@/hooks/usePersons";
import { useTrips } from "@/hooks/useTrips";
import { createPerson } from "@/storage/personsStore";
import { createTrip } from "@/storage/tripsStore";
import { useTheme } from "@/theme";

const DEFAULT_CURRENCY = "NPR";

export default function NewTripScreen() {
  const theme = useTheme();
  const router = useRouter();
  const persons = usePersons();
  const trips = useTrips();

  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const usageByPerson = useMemo(() => {
    const map = new Map<string, number>();
    trips.forEach((t) => {
      const seen = new Set<string>();
      t.members.forEach((m) => {
        if (m.personId && !seen.has(m.personId)) {
          seen.add(m.personId);
          map.set(m.personId, (map.get(m.personId) ?? 0) + 1);
        }
      });
    });
    return map;
  }, [trips]);

  const sortedPersons = useMemo(
    () =>
      persons
        .filter((p) => !p.archivedAt)
        .sort((a, b) => {
          const ua = usageByPerson.get(a.id) ?? 0;
          const ub = usageByPerson.get(b.id) ?? 0;
          if (ua !== ub) return ub - ua;
          return a.name.localeCompare(b.name);
        }),
    [persons, usageByPerson],
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addNew = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const exists = persons.find(
      (p) => p.name.trim().toLowerCase() === trimmed.toLowerCase(),
    );
    if (exists) {
      Alert.alert(
        "Already added",
        `${exists.name} is already in your list. Tap their chip to include them.`,
      );
      setNewName("");
      setSelected((prev) => new Set(prev).add(exists.id));
      return;
    }
    const p = createPerson(trimmed);
    setSelected((prev) => new Set(prev).add(p.id));
    setNewName("");
    setAdding(false);
  };

  const pendingNewName = adding ? newName.trim() : "";
  // Effective member count includes any name still in the inline input — we'll
  // flush it into the trip on Create so the user doesn't lose what they typed.
  const effectiveCount =
    selected.size + (pendingNewName.length > 0 ? 1 : 0);

  const nameError =
    submitted && !name.trim() ? "Give your trip a name" : undefined;
  const memberError =
    submitted && effectiveCount < 2 ? "Select at least two people" : undefined;
  const canSubmit = name.trim().length > 0 && effectiveCount >= 2;

  const handleCreate = () => {
    setSubmitted(true);
    if (!canSubmit) return;

    // Resolve every selected Person up-front so we don't depend on stale
    // hook snapshots after a synchronous createPerson call.
    const byId = new Map(persons.map((p) => [p.id, p]));
    const finalIds = new Set(selected);

    if (pendingNewName) {
      const lowered = pendingNewName.toLowerCase();
      const existing = persons.find(
        (p) => p.name.trim().toLowerCase() === lowered,
      );
      const flushed = existing ?? createPerson(pendingNewName);
      byId.set(flushed.id, flushed);
      finalIds.add(flushed.id);
    }

    const trip = createTrip({
      name,
      currency: DEFAULT_CURRENCY,
      members: [...finalIds]
        .map((id) => byId.get(id))
        .filter((p): p is NonNullable<typeof p> => !!p)
        .map((p) => ({ personId: p.id, name: p.name })),
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
              Tap to include friends in this trip
            </Text>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {sortedPersons.map((p) => {
              const active = selected.has(p.id);
              return (
                <Pressable
                  key={p.id}
                  onPress={() => toggle(p.id)}
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
                      : theme.colors.borderStrong,
                  }}
                >
                  <Text
                    style={{
                      color: active
                        ? theme.colors.accentText
                        : theme.colors.text,
                      fontFamily: "Inter_500Medium",
                    }}
                  >
                    {p.name}
                  </Text>
                </Pressable>
              );
            })}

            {adding ? null : (
              <Pressable
                onPress={() => setAdding(true)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: theme.radii.pill,
                  borderWidth: 1.5,
                  borderStyle: "dashed",
                  borderColor: theme.colors.borderStrong,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Ionicons
                  name="add"
                  size={16}
                  color={theme.colors.accent}
                />
                <Text
                  style={{
                    color: theme.colors.accent,
                    fontFamily: "Inter_600SemiBold",
                  }}
                >
                  New person
                </Text>
              </Pressable>
            )}
          </View>

          {adding ? (
            <View
              style={{
                marginTop: theme.spacing.md,
                flexDirection: "row",
                alignItems: "flex-end",
                gap: theme.spacing.sm,
              }}
            >
              <View style={{ flex: 1 }}>
                <TextField
                  placeholder="Their name"
                  value={newName}
                  onChangeText={setNewName}
                  autoCapitalize="words"
                  maxLength={30}
                  autoFocus
                  onSubmitEditing={addNew}
                  returnKeyType="done"
                />
              </View>
              <Button label="Add" onPress={addNew} />
              <IconButton
                size={40}
                variant="flat"
                onPress={() => {
                  setAdding(false);
                  setNewName("");
                }}
              >
                <Ionicons
                  name="close"
                  size={18}
                  color={theme.colors.textMuted}
                />
              </IconButton>
            </View>
          ) : null}

          {pendingNewName ? (
            <Text
              variant="caption"
              tone="muted"
              style={{ marginTop: theme.spacing.sm }}
            >
              “{pendingNewName}” will be added when you create the trip.
            </Text>
          ) : null}

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
