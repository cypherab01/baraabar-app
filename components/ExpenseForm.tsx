import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { CategoryIcon } from "@/components/CategoryIcon";
import { IconButton } from "@/components/IconButton";
import { MemberAvatar } from "@/components/MemberAvatar";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { TextField } from "@/components/TextField";
import { currencySymbol } from "@/lib/format";
import {
  addExpense,
  deleteExpense,
  updateExpense,
} from "@/storage/tripsStore";
import { useTheme } from "@/theme";
import {
  CATEGORIES,
  type CategoryKey,
  type Expense,
  type Trip,
} from "@/types/models";

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
  const [category, setCategory] = useState<CategoryKey>(
    existing?.category ?? "food",
  );
  const [customLabel, setCustomLabel] = useState(
    existing?.customCategoryLabel ?? "",
  );
  const [note, setNote] = useState(existing?.note ?? "");
  const [submitted, setSubmitted] = useState(false);

  const parsedAmount = useMemo(() => parseAmount(amountText), [amountText]);
  const amountError =
    submitted && (parsedAmount == null || parsedAmount <= 0)
      ? "Enter an amount greater than 0"
      : undefined;
  const payerError = submitted && !payerId ? "Select who paid" : undefined;
  const customLabelError =
    submitted && category === "other" && !customLabel.trim()
      ? "Give this expense a name"
      : undefined;

  const canSubmit =
    parsedAmount != null &&
    parsedAmount > 0 &&
    Boolean(payerId) &&
    (category !== "other" || customLabel.trim().length > 0);

  const onSave = () => {
    setSubmitted(true);
    if (!canSubmit || !payerId || parsedAmount == null) return;

    if (existing) {
      updateExpense(trip.id, existing.id, {
        amount: parsedAmount,
        payerId,
        category,
        customCategoryLabel:
          category === "other" ? customLabel.trim() : undefined,
        note: note.trim() || undefined,
      });
    } else {
      addExpense({
        tripId: trip.id,
        amount: parsedAmount,
        payerId,
        category,
        customCategoryLabel:
          category === "other" ? customLabel.trim() : undefined,
        note: note.trim() || undefined,
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            paddingBottom: theme.spacing["4xl"],
            gap: theme.spacing.xl,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingRight: 8 }}
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
            </ScrollView>
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
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              {CATEGORIES.map((c) => {
                const active = c.key === category;
                return (
                  <Pressable
                    key={c.key}
                    onPress={() => {
                      setCategory(c.key);
                      Haptics.selectionAsync().catch(() => {});
                    }}
                    style={{ alignItems: "center", gap: 6, width: 72 }}
                  >
                    <View
                      style={{
                        padding: 4,
                        borderRadius: theme.radii.lg,
                        borderWidth: 2,
                        borderColor: active
                          ? theme.colors.accent
                          : "transparent",
                      }}
                    >
                      <CategoryIcon category={c.key} size={44} />
                    </View>
                    <Text
                      variant="caption"
                      style={{
                        color: active
                          ? theme.colors.accent
                          : theme.colors.textMuted,
                        fontFamily: active ? "Inter_600SemiBold" : "Inter_500Medium",
                      }}
                    >
                      {c.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {category === "other" ? (
            <TextField
              label="What was it for?"
              placeholder="e.g. Laundry"
              value={customLabel}
              onChangeText={setCustomLabel}
              maxLength={40}
              autoCapitalize="sentences"
              error={customLabelError}
            />
          ) : null}

          <TextField
            label="Note (optional)"
            placeholder="Add a short description"
            value={note}
            onChangeText={setNote}
            maxLength={120}
            autoCapitalize="sentences"
          />
        </ScrollView>

        <View style={{ gap: theme.spacing.sm, paddingTop: theme.spacing.md }}>
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
      </KeyboardAvoidingView>
    </Screen>
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
