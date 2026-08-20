import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, TextInput, View } from "react-native";
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
import {
  createPerson,
  findOrCreatePerson,
  setPersonArchived,
} from "@/storage/personsStore";
import { createTrip } from "@/storage/tripsStore";
import type { Person } from "@/types/models";
import { useTheme } from "@/theme";

const DEFAULT_CURRENCY = "NPR";

export default function NewTripScreen() {
  const theme = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const persons = usePersons();
  const nameRef = useRef<TextInput>(null);
  const newPersonRef = useRef<TextInput>(null);
  const trips = useTrips();

  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  // Non-null once Create is pressed: a snapshot of the chip list taken *before*
  // any store writes. Creating a Person on submit would otherwise insert a chip
  // into this screen in the same frame that router.replace tears the screen
  // down, and Fabric's view recycling crashes with "addViewAt: ... child
  // already has a parent".
  const [frozenPersons, setFrozenPersons] = useState<Person[] | null>(null);

  // Focusing during the modal's enter transition makes the keyboard resize the
  // screen mid-mount, which crashes Fabric with "child already has a parent".
  useEffect(() => {
    const unsubscribe = navigation.addListener(
      // @ts-expect-error native-stack event, not in the typed route event map
      "transitionEnd",
      (e: { data?: { closing?: boolean } }) => {
        if (!e?.data?.closing) nameRef.current?.focus();
      },
    );
    return unsubscribe;
  }, [navigation]);

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

  // Tearing down the focused inline input in the same commit that inserts the
  // new chip makes the keyboard collapse while Fabric is still mounting the
  // wrap row, and Android crashes with "addViewAt: ... child already has a
  // parent". Blur first, then unmount a frame later so the two mount batches
  // never overlap.
  const closeAddRow = () => {
    newPersonRef.current?.blur();
    setNewName("");
    requestAnimationFrame(() => setAdding(false));
  };

  const addNew = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const exists = persons.find(
      (p) => p.name.trim().toLowerCase() === trimmed.toLowerCase(),
    );
    if (exists) {
      // An archived person has no chip to tap, so un-archive them rather than
      // pointing the user at something they can't see.
      if (exists.archivedAt) {
        setPersonArchived(exists.id, false);
      } else {
        Alert.alert(
          "Already added",
          `${exists.name} is already in your list. Tap their chip to include them.`,
        );
      }
      setSelected((prev) => new Set(prev).add(exists.id));
      closeAddRow();
      return;
    }
    const p = createPerson(trimmed);
    setSelected((prev) => new Set(prev).add(p.id));
    closeAddRow();
  };

  // While submitting, keep rendering the pre-submit list so the outgoing screen
  // never mutates its view tree.
  const shownPersons = frozenPersons ?? sortedPersons;

  const pendingNewName = adding ? newName.trim() : "";
  // The pending name resolves to an existing Person when it matches one
  // case-insensitively; only count it as an extra head if that Person isn't
  // already selected, otherwise the gate below passes with 2 while the trip
  // gets built with 1 member.
  const pendingPersonId = pendingNewName
    ? persons.find(
        (p) => p.name.trim().toLowerCase() === pendingNewName.toLowerCase(),
      )?.id
    : undefined;
  const pendingAddsMember =
    pendingNewName.length > 0 &&
    !(pendingPersonId != null && selected.has(pendingPersonId));
  // Effective member count includes any name still in the inline input — we'll
  // flush it into the trip on Create so the user doesn't lose what they typed.
  const effectiveCount = selected.size + (pendingAddsMember ? 1 : 0);

  const nameError =
    submitted && !name.trim() ? "Give your trip a name" : undefined;
  const memberError =
    submitted && effectiveCount < 2 ? "Select at least two people" : undefined;
  const canSubmit = name.trim().length > 0 && effectiveCount >= 2;

  const handleCreate = () => {
    if (frozenPersons) return; // already submitting
    setSubmitted(true);
    if (!canSubmit) return;
    setFrozenPersons(sortedPersons);

    // Resolve every selected Person up-front so we don't depend on stale
    // hook snapshots after a synchronous createPerson call.
    const byId = new Map(persons.map((p) => [p.id, p]));
    const finalIds = new Set(selected);

    if (pendingNewName) {
      // findOrCreatePerson also un-archives a matching Person, and finalIds is
      // a Set so re-adding an already-selected id is a no-op.
      const flushed = findOrCreatePerson(pendingNewName);
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
    // Leave on the next frame so the store writes above commit in a mount
    // batch of their own, separate from the screen swap.
    requestAnimationFrame(() => router.replace(`/trip/${trip.id}` as never));
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
          ref={nameRef}
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
            {shownPersons.map((p) => {
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
                  ref={newPersonRef}
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
                onPress={closeAddRow}
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
