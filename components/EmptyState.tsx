import { View } from "react-native";
import { useTheme } from "@/theme";
import { Text } from "./Text";

interface EmptyStateProps {
  emoji?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ emoji, title, description, action }: EmptyStateProps) {
  const theme = useTheme();
  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: theme.spacing["4xl"],
        paddingHorizontal: theme.spacing["2xl"],
        gap: theme.spacing.md,
      }}
    >
      {emoji ? (
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: theme.colors.surfaceAlt,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: theme.spacing.sm,
          }}
        >
          <Text style={{ fontSize: 34, lineHeight: 40 }}>{emoji}</Text>
        </View>
      ) : null}
      <Text variant="heading" align="center">
        {title}
      </Text>
      {description ? (
        <Text variant="body" tone="muted" align="center">
          {description}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: theme.spacing.sm }}>{action}</View> : null}
    </View>
  );
}
