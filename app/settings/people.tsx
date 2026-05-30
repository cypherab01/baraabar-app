import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
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
  deletePerson,
  renamePerson,
} from "@/storage/personsStore";
import { tripsStore } from "@/storage/tripsStore";
import { useTheme } from "@/theme";
import type { Person } from "@/types/models";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "?").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
}

export default function PeopleScreen() {
  const theme = useTheme();
  const persons = usePersons();
  const trips = useTrips();
  const [editing, setEditing] = useState<Person | null>(null);
  const [adding, setAdding] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [cascadeRename, setCascadeRename] = useState(false);

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

  const sorted = useMemo(
    () =>
      [...persons].sort((a, b) => {
        const ua = usageByPerson.get(a.id) ?? 0;
        const ub = usageByPerson.get(b.id) ?? 0;
        if (ua !== ub) return ub - ua;
        return b.createdAt - a.createdAt;
      }),
    [persons, usageByPerson],
  );

  const openEdit = (p: Person) => {
    setEditing(p);
    setDraftName(p.name);
    setCascadeRename(false);
  };

  const closeSheet = () => {
    setEditing(null);
    setAdding(false);
    setDraftName("");
    setCascadeRename(false);
  };

  const saveRename = () => {
    if (!editing) return;
    const next = draftName.trim();
    if (!next) return;
    renamePerson(editing.id, next);
    if (cascadeRename) {
      tripsStore.set((prev) =>
        prev.map((t) => ({
          ...t,
          members: t.members.map((m) =>
            m.personId === editing.id ? { ...m, name: next } : m,
          ),
        })),
      );
    }
    closeSheet();
  };

  const confirmDelete = () => {
    if (!editing) return;
    const usage = usageByPerson.get(editing.id) ?? 0;
    if (usage > 0) {
      Alert.alert(
        "Can't delete",
        `${editing.name} is used in ${usage} trip${usage === 1 ? "" : "s"}.`,
      );
      return;
    }
    Alert.alert("Delete person?", `${editing.name} will be removed.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deletePerson(editing.id);
          closeSheet();
        },
      },
    ]);
  };

  const saveNew = () => {
    const next = draftName.trim();
    if (!next) return;
    const exists = persons.some(
      (p) => p.name.trim().toLowerCase() === next.toLowerCase(),
    );
    if (exists) {
      Alert.alert("Already added", `Someone named "${next}" already exists.`);
      return;
    }
    createPerson(next);
    closeSheet();
  };

  return (
    <Screen>
      <AppHeader
        title="People"
        subtitle="Friends you've shared trips with"
        showBack
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: theme.spacing["4xl"],
          gap: theme.spacing.lg,
        }}
      >
        {sorted.length === 0 ? (
          <Card padded>
            <Text variant="body" tone="muted">
              No people yet. Add someone here, or create a trip to add people
              inline.
            </Text>
          </Card>
        ) : (
          <Card padded={false}>
            {sorted.map((p, i) => {
              const usage = usageByPerson.get(p.id) ?? 0;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => openEdit(p)}
                  android_ripple={{ color: theme.colors.accentSoft }}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: theme.spacing.md,
                    paddingVertical: theme.spacing.md,
                    paddingHorizontal: theme.spacing.md,
                    backgroundColor: pressed
                      ? theme.colors.surfaceAlt
                      : "transparent",
                    borderBottomWidth: i < sorted.length - 1 ? 0.5 : 0,
                    borderBottomColor: theme.colors.border,
                  })}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: theme.colors.accentSoft,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: theme.colors.accent,
                        fontFamily: "Inter_600SemiBold",
                      }}
                    >
                      {initials(p.name)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text>{p.name}</Text>
                    <Text variant="caption" tone="muted">
                      Used in {usage} trip{usage === 1 ? "" : "s"}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={theme.colors.textSubtle}
                  />
                </Pressable>
              );
            })}
          </Card>
        )}

        <Button
          label="Add person"
          size="lg"
          block
          onPress={() => {
            setAdding(true);
            setDraftName("");
          }}
        />
      </ScrollView>

      <Modal
        visible={!!editing || adding}
        transparent
        animationType="slide"
        onRequestClose={closeSheet}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <Pressable
            onPress={closeSheet}
            style={{
              flex: 1,
              backgroundColor: theme.colors.overlay,
              justifyContent: "flex-end",
            }}
          >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: theme.colors.bgElevated,
              padding: theme.spacing.xl,
              gap: theme.spacing.md,
              borderTopLeftRadius: theme.radii.xl,
              borderTopRightRadius: theme.radii.xl,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text variant="heading">
                {editing ? "Edit person" : "Add person"}
              </Text>
              <IconButton
                variant="soft"
                size={36}
                onPress={closeSheet}
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={18} color={theme.colors.text} />
              </IconButton>
            </View>

            <TextField
              label="Name"
              value={draftName}
              onChangeText={setDraftName}
              autoCapitalize="words"
              maxLength={40}
              autoFocus
            />

            {editing ? (
              <Pressable
                onPress={() => setCascadeRename((v) => !v)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: cascadeRename }}
                accessibilityLabel="Also rename in all trips"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: theme.spacing.sm,
                  paddingVertical: theme.spacing.sm,
                }}
              >
                <Ionicons
                  name={cascadeRename ? "checkbox" : "square-outline"}
                  size={22}
                  color={
                    cascadeRename ? theme.colors.accent : theme.colors.textSubtle
                  }
                />
                <Text style={{ flex: 1 }}>Also rename in all trips</Text>
              </Pressable>
            ) : null}

            <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
              {editing ? (
                <Button
                  variant="ghost"
                  label="Delete"
                  onPress={confirmDelete}
                />
              ) : null}
              <View style={{ flex: 1 }}>
                <Button
                  label="Save"
                  block
                  onPress={editing ? saveRename : saveNew}
                />
              </View>
            </View>
          </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}
