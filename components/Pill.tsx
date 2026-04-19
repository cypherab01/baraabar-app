import { View, type ViewStyle } from "react-native";
import { useTheme } from "@/theme";
import { Text } from "./Text";

type Tone = "neutral" | "accent" | "positive" | "negative" | "warning";

interface PillProps {
  label: string;
  tone?: Tone;
  size?: "sm" | "md";
  style?: ViewStyle;
}

export function Pill({ label, tone = "neutral", size = "md", style }: PillProps) {
  const theme = useTheme();
  const palette = {
    neutral: {
      bg: theme.colors.surfaceAlt,
      fg: theme.colors.textMuted,
    },
    accent: {
      bg: theme.colors.accentSoft,
      fg: theme.colors.accent,
    },
    positive: {
      bg: theme.colors.positiveSoft,
      fg: theme.colors.positive,
    },
    negative: {
      bg: theme.colors.negativeSoft,
      fg: theme.colors.negative,
    },
    warning: {
      bg:
        theme.scheme === "dark"
          ? "rgba(231, 184, 78, 0.18)"
          : "rgba(194, 138, 0, 0.1)",
      fg: theme.colors.warning,
    },
  }[tone];

  return (
    <View
      style={[
        {
          paddingHorizontal: size === "sm" ? 8 : 10,
          paddingVertical: size === "sm" ? 3 : 5,
          borderRadius: theme.radii.pill,
          backgroundColor: palette.bg,
          alignSelf: "flex-start",
        },
        style,
      ]}
    >
      <Text
        variant={size === "sm" ? "caption" : "label"}
        style={{ color: palette.fg, fontFamily: "Inter_600SemiBold" }}
      >
        {label}
      </Text>
    </View>
  );
}
