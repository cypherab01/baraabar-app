import * as Haptics from "expo-haptics";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type ViewStyle,
} from "react-native";
import { useTheme } from "@/theme";
import { Text } from "./Text";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends Omit<PressableProps, "style" | "children"> {
  label: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  block?: boolean;
  haptic?: boolean;
  style?: ViewStyle | ViewStyle[];
}

const SIZE_MAP = {
  sm: { h: 36, px: 14, font: "label" as const },
  md: { h: 46, px: 18, font: "bodyMedium" as const },
  lg: { h: 56, px: 22, font: "subheading" as const },
};

export function Button({
  label,
  leading,
  trailing,
  variant = "primary",
  size = "md",
  loading,
  block,
  haptic = true,
  disabled,
  onPress,
  style,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const dims = SIZE_MAP[size];

  const isDisabled = disabled || loading;

  const bg =
    variant === "primary"
      ? theme.colors.accent
      : variant === "danger"
        ? theme.colors.negative
        : variant === "secondary"
          ? theme.colors.surfaceAlt
          : "transparent";

  const color =
    variant === "primary" || variant === "danger"
      ? theme.colors.accentText
      : variant === "secondary"
        ? theme.colors.text
        : theme.colors.accent;

  const border: ViewStyle =
    variant === "ghost"
      ? { borderWidth: 0 }
      : variant === "secondary"
        ? { borderWidth: 1, borderColor: theme.colors.border }
        : { borderWidth: 0 };

  return (
    <Pressable
      {...rest}
      disabled={isDisabled}
      onPress={(e) => {
        if (haptic) {
          Haptics.selectionAsync().catch(() => {});
        }
        onPress?.(e);
      }}
      style={({ pressed }) =>
        StyleSheet.flatten([
          {
            height: dims.h,
            paddingHorizontal: dims.px,
            borderRadius: theme.radii.md,
            backgroundColor: bg,
            opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            alignSelf: block ? "stretch" : "flex-start",
            gap: 8,
          },
          border,
          style,
        ])
      }
    >
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <>
          {leading ? <View>{leading}</View> : null}
          <Text
            variant={dims.font}
            style={{ color, fontFamily: "Inter_600SemiBold" }}
          >
            {label}
          </Text>
          {trailing ? <View>{trailing}</View> : null}
        </>
      )}
    </Pressable>
  );
}
