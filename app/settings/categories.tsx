import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  Alert,
  Modal,
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
import { useCategories } from "@/hooks/useCategories";
import { useTrips } from "@/hooks/useTrips";
import {
  archiveCategory,
  createCategory,
  deleteCategory,
  resetCategoryToDefault,
  unarchiveCategory,
  updateCategory,
} from "@/storage/categoriesStore";
import { expensesStoreFor } from "@/storage/tripsStore";
import { useTheme } from "@/theme";
import type { Category } from "@/types/models";

const EMOJI_GRID = ["🍽️", "🚖", "🏨", "🎟️", "🍻", "🛒", "🎁", "🏥", "🎵", "✨"];

export default function CategoriesScreen() {
  const theme = useTheme();
  const categories = useCategories();
  const trips = useTrips();

  const [editing, setEditing] = useState<Category | null>(null);
  const [adding, setAdding] = useState(false);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftEmoji, setDraftEmoji] = useState("✨");

  const usage = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of trips) {
      const exps = expensesStoreFor(t.id).getSnapshot();
      for (const e of exps) {
        map.set(e.categoryId, (map.get(e.categoryId) ?? 0) + 1);
      }
    }
    return map;
  }, [trips]);

  const active = categories.filter((c) => !c.archivedAt);
  const archived = categories.filter((c) => !!c.archivedAt);

  const openEdit = (c: Category) => {
    setEditing(c);
    setDraftLabel(c.label);
    setDraftEmoji(c.emoji);
  };

  const close = () => {
    setEditing(null);
    setAdding(false);
    setDraftLabel("");
    setDraftEmoji("✨");
  };

  const save = () => {
    const label = draftLabel.trim();
    const emoji = draftEmoji.trim() || "✨";
    if (!label) return;
    if (editing) {
      updateCategory(editing.id, { label, emoji });
    } else {
      createCategory({ label, emoji });
    }
    close();
  };

  const handleArchive = () => {
    if (!editing) return;
    archiveCategory(editing.id);
    close();
  };

  const handleUnarchive = () => {
    if (!editing) return;
    unarchiveCategory(editing.id);
    close();
  };

  const handleDelete = () => {
    if (!editing) return;
    const count = usage.get(editing.id) ?? 0;
    if (count > 0) {
      Alert.alert(
        "Can't delete",
        `Used by ${count} expense${count === 1 ? "" : "s"}. Archive instead.`,
      );
      return;
    }
    Alert.alert("Delete category?", `${editing.label} will be removed.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteCategory(editing.id);
          close();
        },
      },
    ]);
  };

  const handleReset = () => {
    if (!editing) return;
    resetCategoryToDefault(editing.id);
    close();
  };

  return (
    <Screen>
      <AppHeader title="Categories" subtitle="Tag your expenses" showBack />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: theme.spacing["4xl"],
          gap: theme.spacing.lg,
        }}
      >
        <Card padded={false}>
          {active.map((c, i) => (
            <CategoryRow
              key={c.id}
              category={c}
              usage={usage.get(c.id) ?? 0}
              onPress={() => openEdit(c)}
              divider={i < active.length - 1}
            />
          ))}
        </Card>

        {archived.length > 0 ? (
          <>
            <Text variant="overline" tone="subtle">
              Archived
            </Text>
            <Card padded={false}>
              {archived.map((c, i) => (
                <CategoryRow
                  key={c.id}
                  category={c}
                  usage={usage.get(c.id) ?? 0}
                  onPress={() => openEdit(c)}
                  divider={i < archived.length - 1}
                  muted
                />
              ))}
            </Card>
          </>
        ) : null}

        <Button
          label="New category"
          size="lg"
          block
          onPress={() => {
            setAdding(true);
            setDraftLabel("");
            setDraftEmoji("✨");
          }}
        />
      </ScrollView>

      <Modal
        visible={!!editing || adding}
        transparent
        animationType="slide"
        onRequestClose={close}
      >
        <Pressable
          onPress={close}
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
                {editing ? "Edit category" : "New category"}
              </Text>
              <IconButton
                variant="soft"
                size={36}
                onPress={close}
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={18} color={theme.colors.text} />
              </IconButton>
            </View>

            <TextField
              label="Label"
              value={draftLabel}
              onChangeText={setDraftLabel}
              autoCapitalize="sentences"
              maxLength={30}
              autoFocus
            />

            <Text variant="caption" tone="muted">
              Emoji
            </Text>
            <View
              style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
            >
              {EMOJI_GRID.map((em) => {
                const isActive = em === draftEmoji;
                return (
                  <Pressable
                    key={em}
                    onPress={() => setDraftEmoji(em)}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: theme.radii.md,
                      backgroundColor: isActive
                        ? theme.colors.accentSoft
                        : theme.colors.surface,
                      borderWidth: 1,
                      borderColor: isActive
                        ? theme.colors.accent
                        : theme.colors.borderStrong,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 20 }}>{em}</Text>
                  </Pressable>
                );
              })}
            </View>
            <TextField
              label="Or paste your own"
              value={draftEmoji}
              onChangeText={setDraftEmoji}
              maxLength={4}
            />

            <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
              {editing ? (
                editing.isDefault ? (
                  <Button
                    variant="secondary"
                    label="Reset"
                    onPress={handleReset}
                  />
                ) : null
              ) : null}
              {editing ? (
                editing.archivedAt ? (
                  <Button
                    variant="secondary"
                    label="Unarchive"
                    onPress={handleUnarchive}
                  />
                ) : (
                  <Button
                    variant="secondary"
                    label="Archive"
                    onPress={handleArchive}
                  />
                )
              ) : null}
              {editing && !editing.isDefault ? (
                <Button label="Delete" onPress={handleDelete} />
              ) : null}
              <View style={{ flex: 1 }}>
                <Button label="Save" block onPress={save} />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function CategoryRow({
  category,
  usage,
  onPress,
  divider,
  muted,
}: {
  category: Category;
  usage: number;
  onPress: () => void;
  divider: boolean;
  muted?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: theme.colors.accentSoft }}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
        backgroundColor: pressed ? theme.colors.surfaceAlt : "transparent",
        opacity: muted ? 0.55 : 1,
        borderBottomWidth: divider ? 0.5 : 0,
        borderBottomColor: theme.colors.border,
      })}
    >
      <Text style={{ fontSize: 22 }}>{category.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text>{category.label}</Text>
        <Text variant="caption" tone="muted">
          {category.isDefault ? "Default · " : ""}Used by {usage} expense
          {usage === 1 ? "" : "s"}
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={theme.colors.textSubtle}
      />
    </Pressable>
  );
}
