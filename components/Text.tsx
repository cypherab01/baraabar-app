import {
  StyleSheet,
  Text as RNText,
  type TextProps as RNTextProps,
  type TextStyle,
} from "react-native";
import { useTheme, type Typography } from "@/theme";

type TypographyVariant = keyof Typography;
type Tone = "default" | "muted" | "subtle" | "accent" | "positive" | "negative";

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  tone?: Tone;
  align?: TextStyle["textAlign"];
  weight?: "regular" | "medium" | "semibold" | "bold";
}

const WEIGHT_MAP = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
} as const;

export function Text({
  variant = "body",
  tone = "default",
  align,
  weight,
  style,
  ...rest
}: TextProps) {
  const theme = useTheme();
  const typo = theme.typography[variant] as TextStyle;
  const color =
    tone === "muted"
      ? theme.colors.textMuted
      : tone === "subtle"
        ? theme.colors.textSubtle
        : tone === "accent"
          ? theme.colors.accent
          : tone === "positive"
            ? theme.colors.positive
            : tone === "negative"
              ? theme.colors.negative
              : theme.colors.text;
  const override: TextStyle = {
    ...typo,
    color,
    textAlign: align,
    ...(weight ? { fontFamily: WEIGHT_MAP[weight] } : null),
  };
  return <RNText {...rest} style={StyleSheet.flatten([override, style])} />;
}
