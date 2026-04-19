import { Pressable, View } from "react-native";
import { formatAmount, formatRelativeDate } from "@/lib/format";
import { useTheme } from "@/theme";
import { CATEGORIES, type CategoryKey, type Expense, type Member } from "@/types/models";
import { CategoryIcon } from "./CategoryIcon";
import { Text } from "./Text";

interface ExpenseRowProps {
  expense: Expense;
  members: Member[];
  currency: string;
  onPress?: () => void;
  onLongPress?: () => void;
}

const categoryLabel = (key: CategoryKey): string => {
  return CATEGORIES.find((c) => c.key === key)?.label ?? "Other";
};

export function ExpenseRow({
  expense,
  members,
  currency,
  onPress,
  onLongPress,
}: ExpenseRowProps) {
  const theme = useTheme();
  const payer = members.find((m) => m.id === expense.payerId);
  const label =
    expense.category === "other" && expense.customCategoryLabel
      ? expense.customCategoryLabel
      : categoryLabel(expense.category);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.md,
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radii.lg,
          borderWidth: theme.scheme === "dark" ? 1 : 0,
          borderColor: theme.colors.border,
        }}
      >
        <CategoryIcon category={expense.category} size={44} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyMedium" numberOfLines={1}>
            {label}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {payer?.name ?? "Unknown"} · {formatRelativeDate(expense.createdAt)}
            {expense.note ? ` · ${expense.note}` : ""}
          </Text>
        </View>
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 16,
            color: theme.colors.text,
            fontVariant: ["tabular-nums"],
          }}
        >
          {formatAmount(expense.amount, currency)}
        </Text>
      </View>
    </Pressable>
  );
}
