import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { useTheme } from "@/theme";
import { IconButton } from "./IconButton";
import { Text } from "./Text";

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  trailing?: React.ReactNode;
}

export function AppHeader({
  title,
  subtitle,
  showBack,
  onBack,
  trailing,
}: AppHeaderProps) {
  const theme = useTheme();
  const router = useRouter();
  const handleBack = () => {
    if (onBack) return onBack();
    if (router.canGoBack()) router.back();
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: theme.spacing.md,
        gap: theme.spacing.md,
        minHeight: 56,
      }}
    >
      {showBack ? (
        <IconButton size={40} variant="soft" onPress={handleBack}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
        </IconButton>
      ) : null}
      <View style={{ flex: 1 }}>
        {title ? (
          <Text variant="heading" numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}
