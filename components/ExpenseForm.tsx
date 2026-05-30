import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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
import { MemberAvatar } from "@/components/MemberAvatar";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { TextField } from "@/components/TextField";
import { currencySymbol, formatAmount } from "@/lib/format";
import {
  addExpense,
  deleteExpense,
  updateExpense,
} from "@/storage/tripsStore";
import { useTheme } from "@/theme";
import { useCategories } from "@/hooks/useCategories";
import type { Expense, Trip } from "@/types/models";

interface ExpenseFormProps {
  trip: Trip;
  existing?: Expense;
}

export function ExpenseForm({ trip, existing }: ExpenseFormProps) {
  const theme = useTheme();
  const router = useRouter();

  const [amountText, setAmountText] = useState(
    existing ? formatAmountInput(existing.amount) : "",
  );
  const [payerId, setPayerId] = useState<string | undefined>(
    existing?.payerId ?? trip.members[0]?.id,
  );
  const [categoryId, setCategoryId] = useState<string>(
    existing?.categoryId ?? "food",
  );
  const [note, setNote] = useState(existing?.note ?? "");
  const [submitted, setSubmitted] = useState(false);
  const [splitEveryone, setSplitEveryone] = useState(!existing?.splitWith);
  const [selectedSplitIds, setSelectedSplitIds] = useState<Set<string>>(() => {
    if (existing?.splitWith) {
      const valid = existing.splitWith.filter((id) =>
        trip.members.some((m) => m.id === id),
      );
      return new Set(valid);
    }
    return new Set(trip.members.map((m) => m.id));
  });

  const parsedAmount = useMemo(() => parseAmount(amountText), [amountText]);
  const amountError =
    submitted && (parsedAmount == null || parsedAmount <= 0)
      ? "Enter an amount greater than 0"
      : undefined;
  const payerError = submitted && !payerId ? "Select who paid" : undefined;

  const selectedCount = splitEveryone ? trip.members.length : selectedSplitIds.size;

  const canSubmit =
    parsedAmount != null &&
    parsedAmount > 0 &&
    Boolean(payerId) &&
    selectedCount > 0;

  const perShare =
    parsedAmount != null && parsedAmount > 0 && selectedCount > 0
      ? parsedAmount / selectedCount
      : null;

  const toggleSplitEveryone = (next: boolean) => {
    setSplitEveryone(next);
    setSelectedSplitIds(new Set(trip.members.map((m) => m.id)));
    Haptics.selectionAsync().catch(() => {});
  };

  const toggleSplitMember = (id: string) => {
    setSelectedSplitIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    Haptics.selectionAsync().catch(() => {});
  };

  const onSave = () => {
    setSubmitted(true);
    if (!canSubmit || !payerId || parsedAmount == null) return;

    const splitWith = splitEveryone
      ? undefined
      : Array.from(selectedSplitIds);

    if (existing) {
      updateExpense(trip.id, existing.id, {
        amount: parsedAmount,
        payerId,
        categoryId,
        note: note.trim() || undefined,
        splitWith,
      });
    } else {
      addExpense({
        tripId: trip.id,
        amount: parsedAmount,
        payerId,
        categoryId,
        note: note.trim() || undefined,
        splitWith,
      });
    }
    Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success,
    ).catch(() => {});
    router.back();
  };

  const onDelete = () => {
    if (!existing) return;
    Alert.alert("Delete expense", "Remove this expense permanently?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteExpense(trip.id, existing.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <Screen edges={["top", "left", "right", "bottom"]}>
      <AppHeader
        title={existing ? "Edit expense" : "New expense"}
        subtitle={trip.name}
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
          gap: theme.spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}
      >
          <Card padded>
            <Text variant="overline" tone="subtle">
              Amount
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "baseline",
                gap: 8,
                marginTop: 8,
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  fontSize: 34,
                  color: theme.colors.textSubtle,
                }}
              >
                {currencySymbol(trip.currency)}
              </Text>
              <TextField
                value={amountText}
                onChangeText={(v) =>
                  setAmountText(v.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"))
                }
                placeholder="0"
                keyboardType="decimal-pad"
                containerStyle={{ flex: 1 }}
                error={amountError}
                style={{
                  fontFamily: "Inter_700Bold",
                  fontSize: 34,
                  paddingVertical: 4,
                }}
                autoFocus={!existing}
              />
            </View>
          </Card>

          <View style={{ gap: theme.spacing.sm }}>
            <Text variant="label" tone="muted">
              Paid by
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {trip.members.map((m) => {
                const active = m.id === payerId;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => {
                      setPayerId(m.id);
                      Haptics.selectionAsync().catch(() => {});
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        paddingRight: 14,
                        paddingLeft: 4,
                        paddingVertical: 4,
                        borderRadius: theme.radii.pill,
                        backgroundColor: active
                          ? theme.colors.accent
                          : theme.colors.surface,
                        borderWidth: 1,
                        borderColor: active
                          ? theme.colors.accent
                          : theme.colors.border,
                      }}
                    >
                      <MemberAvatar name={m.name} size={30} />
                      <Text
                        variant="label"
                        style={{
                          color: active
                            ? theme.colors.accentText
                            : theme.colors.text,
                          fontFamily: "Inter_600SemiBold",
                        }}
                      >
                        {m.name}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            {payerError ? (
              <Text variant="caption" tone="negative">
                {payerError}
              </Text>
            ) : null}
          </View>

          <View style={{ gap: theme.spacing.sm }}>
            <Text variant="label" tone="muted">
              Category
            </Text>
            <CategoryChips
              categoryId={categoryId}
              setCategoryId={setCategoryId}
            />
          </View>

          <TextField
            label="Note (optional)"
            placeholder="Add a short description"
            value={note}
            onChangeText={setNote}
            maxLength={120}
            autoCapitalize="sentences"
          />

          <View style={{ gap: theme.spacing.sm }}>
            <Pressable
              onPress={() => toggleSplitEveryone(!splitEveryone)}
              accessibilityRole="switch"
              accessibilityState={{ checked: splitEveryone }}
              accessibilityLabel="Split equally with everyone"
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: theme.spacing.sm,
              }}
            >
              <View style={{ flex: 1, paddingRight: theme.spacing.md }}>
                <Text variant="bodyMedium">Split equally with everyone</Text>
                <Text variant="caption" tone="muted">
                  Turn off to pick who&apos;s splitting this one
                </Text>
              </View>
              <View
                style={{
                  width: 44,
                  height: 26,
                  borderRadius: 13,
                  padding: 2,
                  backgroundColor: splitEveryone
                    ? theme.colors.accent
                    : theme.colors.surfaceAlt,
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: theme.colors.bgElevated,
                    alignSelf: splitEveryone ? "flex-end" : "flex-start",
                  }}
                />
              </View>
            </Pressable>

            {!splitEveryone ? (
              <View style={{ gap: theme.spacing.sm }}>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  {trip.members.map((m) => {
                    const active = selectedSplitIds.has(m.id);
                    return (
                      <Pressable
                        key={m.id}
                        onPress={() => toggleSplitMember(m.id)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: active }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: theme.radii.pill,
                            backgroundColor: active
                              ? theme.colors.accentSoft
                              : theme.colors.surface,
                            borderWidth: 1,
                            borderColor: active
                              ? theme.colors.accent
                              : theme.colors.border,
                          }}
                        >
                          <Ionicons
                            name={active ? "checkmark-circle" : "ellipse-outline"}
                            size={16}
                            color={active ? theme.colors.accent : theme.colors.textSubtle}
                          />
                          <Text
                            variant="label"
                            style={{
                              color: active ? theme.colors.text : theme.colors.textMuted,
                              fontFamily: active ? "Inter_600SemiBold" : "Inter_500Medium",
                            }}
                          >
                            {m.name}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
                <Text variant="caption" tone={selectedCount === 0 ? "negative" : "muted"}>
                  {selectedCount === 0
                    ? "Pick at least one person to split with"
                    : perShare != null
                      ? `${selectedCount} of ${trip.members.length} splitting · ${formatAmount(perShare, trip.currency)} each`
                      : `${selectedCount} of ${trip.members.length} splitting`}
                </Text>
              </View>
            ) : null}
          </View>
      </KeyboardAwareScrollView>

      <KeyboardStickyView offset={{ closed: 0, opened: 0 }}>
        <View
          style={{
            gap: theme.spacing.sm,
            paddingVertical: theme.spacing.md,
            backgroundColor: theme.colors.bg,
          }}
        >
          <Button
            label={existing ? "Save changes" : "Add expense"}
            size="lg"
            block
            onPress={onSave}
            disabled={submitted && !canSubmit}
          />
          {existing ? (
            <Pressable
              onPress={onDelete}
              style={({ pressed }) => ({
                height: 46,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={{
                  color: theme.colors.negative,
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 15,
                }}
              >
                Delete expense
              </Text>
            </Pressable>
          ) : null}
        </View>
      </KeyboardStickyView>
    </Screen>
  );
}

interface CategoryChipsProps {
  categoryId: string;
  setCategoryId: (id: string) => void;
}

function CategoryChips({ categoryId, setCategoryId }: CategoryChipsProps) {
  const theme = useTheme();
  const categories = useCategories();
  const visibleCategories = categories.filter((c) => !c.archivedAt);
  const selectedArchived = categories.find((c) => c.id === categoryId)?.archivedAt;
  const selectedCategory = selectedArchived
    ? categories.find((c) => c.id === categoryId)
    : null;

  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
      }}
    >
      {selectedArchived ? (
        <Pressable
          key="__archived__"
          style={{
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: theme.radii.pill,
            backgroundColor: theme.colors.accentSoft,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            opacity: 0.75,
          }}
          onPress={() => {}}
        >
          <Text>
            {selectedCategory?.emoji ?? "•"}{" "}
            {selectedCategory?.label ?? "Unknown"}{" "}
            (archived)
          </Text>
        </Pressable>
      ) : null}
      {visibleCategories.map((c) => {
        const isActive = c.id === categoryId;
        return (
          <Pressable
            key={c.id}
            onPress={() => {
              setCategoryId(c.id);
              Haptics.selectionAsync().catch(() => {});
            }}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: theme.radii.pill,
              backgroundColor: isActive
                ? theme.colors.accent
                : theme.colors.surface,
              borderWidth: 1,
              borderColor: isActive
                ? theme.colors.accent
                : theme.colors.borderStrong,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Text
              style={{
                color: isActive ? theme.colors.accentText : theme.colors.text,
              }}
            >
              {c.emoji} {c.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function parseAmount(text: string): number | null {
  if (!text) return null;
  const n = Number.parseFloat(text);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

function formatAmountInput(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2);
}
