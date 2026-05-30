import { Pressable, View } from "react-native";
import { useCategoriesById } from "@/hooks/useCategories";
import { formatAmount, formatRelativeDate } from "@/lib/format";
import { useTheme } from "@/theme";
import type { Expense, Member } from "@/types/models";
import { CategoryIcon } from "./CategoryIcon";
import { Text } from "./Text";

interface ExpenseRowProps {
  expense: Expense;
  members: Member[];
  currency: string;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function ExpenseRow({
  expense,
  members,
  currency,
  onPress,
  onLongPress,
}: ExpenseRowProps) {
  const theme = useTheme();
  const byId = useCategoriesById();
  const cat = byId.get(expense.categoryId);
  const label = cat?.label ?? "Unknown";
  const payer = members.find((m) => m.id === expense.payerId);
  const splitWithLabel = expense.splitWith
    ? buildSplitWithLabel(expense.splitWith, members)
    : null;

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
        <CategoryIcon categoryId={expense.categoryId} size={44} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyMedium" numberOfLines={1}>
            {label}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {payer?.name ?? "Unknown"} · {formatRelativeDate(expense.createdAt)}
            {expense.note ? ` · ${expense.note}` : ""}
          </Text>
          {splitWithLabel ? (
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {splitWithLabel}
            </Text>
          ) : null}
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

function buildSplitWithLabel(splitWith: string[], members: Member[]): string {
  const validNames = splitWith
    .map((id) => members.find((m) => m.id === id)?.name)
    .filter((n): n is string => Boolean(n));
  if (validNames.length === 0) return "Split with —";
  const head = validNames.slice(0, 2).join(", ");
  const extra = splitWith.length - 2;
  return extra > 0 ? `Split with ${head} +${extra}` : `Split with ${head}`;
}
