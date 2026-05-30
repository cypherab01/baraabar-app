import { Ionicons } from "@expo/vector-icons";
import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { useContext } from "react";
import type React from "react";
import { Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme";
import { Text } from "./Text";

interface FABProps {
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  label?: string;
  onPress: () => void;
  accessibilityLabel?: string;
  size?: "md" | "lg";
}

export function FAB({
  icon = "add",
  label,
  onPress,
  accessibilityLabel,
  size = "md",
}: FABProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useContext(BottomTabBarHeightContext);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  const diameter = size === "lg" ? 64 : 56;
  const iconSize = size === "lg" ? 28 : 26;

  const bottomInset =
    tabBarHeight != null
      ? theme.spacing.lg
      : Math.max(insets.bottom, theme.spacing.md) + theme.spacing.lg;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        right: theme.spacing.xl,
        bottom: bottomInset,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label ?? "Add"}
        onPress={handlePress}
        android_ripple={{
          color: "rgba(255,255,255,0.15)",
          borderless: false,
          radius: diameter / 1.2,
        }}
        style={({ pressed }) => ({
          height: diameter,
          minWidth: diameter,
          paddingHorizontal: label ? 22 : 0,
          borderRadius: diameter / 2,
          backgroundColor: theme.colors.accent,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 8,
          transform: [{ scale: pressed ? 0.97 : 1 }],
          shadowColor: "#000",
          shadowOpacity: theme.scheme === "dark" ? 0.45 : 0.22,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
          elevation: Platform.OS === "android" ? 8 : 0,
        })}
      >
        <Ionicons name={icon} size={iconSize} color={theme.colors.accentText} />
        {label ? (
          <Text
            style={{
              color: theme.colors.accentText,
              fontFamily: "Inter_600SemiBold",
              fontSize: size === "lg" ? 16 : 15,
            }}
          >
            {label}
          </Text>
        ) : null}
      </Pressable>
    </View>
  );
}
