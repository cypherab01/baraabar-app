import * as Haptics from "expo-haptics";
import React from "react";
import { Pressable, type PressableProps, type ViewStyle } from "react-native";
import { useTheme } from "@/theme";

interface IconButtonProps extends Omit<PressableProps, "style" | "children"> {
  children: React.ReactNode;
  size?: number;
  variant?: "flat" | "soft" | "accent";
  haptic?: boolean;
  style?: ViewStyle;
}

export function IconButton({
  children,
  size = 40,
  variant = "flat",
  haptic = true,
  onPress,
  style,
  ...rest
}: IconButtonProps) {
  const theme = useTheme();

  const bg =
    variant === "accent"
      ? theme.colors.accent
      : variant === "soft"
        ? theme.colors.surfaceAlt
        : "transparent";

  return (
    <Pressable
      {...rest}
      onPress={(e) => {
        if (haptic) Haptics.selectionAsync().catch(() => {});
        onPress?.(e);
      }}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2.4,
          backgroundColor: bg,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}
