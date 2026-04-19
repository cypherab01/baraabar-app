import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme";
import { Text } from "./Text";

export interface ActionSheetOption {
  key?: string;
  label: string;
  description?: string;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  destructive?: boolean;
  onPress: () => void;
}

interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  options: ActionSheetOption[];
}

export function ActionSheet({
  visible,
  onClose,
  title,
  message,
  options,
}: ActionSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fade, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slide, {
          toValue: 1,
          duration: 260,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slide.setValue(0);
      fade.setValue(0);
    }
  }, [visible, slide, fade]);

  const translateY = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [340, 0],
  });

  const handleSelect = (opt: ActionSheetOption) => {
    Haptics.selectionAsync().catch(() => {});
    onClose();
    setTimeout(() => opt.onPress(), 60);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <Pressable
        onPress={onClose}
        style={{ flex: 1, justifyContent: "flex-end" }}
      >
        <Animated.View
          pointerEvents="none"
          style={{
            ...({
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: theme.colors.overlay,
            } as ViewStyle),
            opacity: fade,
          }}
        />
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Animated.View
            style={{
              transform: [{ translateY }],
              backgroundColor: theme.colors.bgElevated,
              borderTopLeftRadius: theme.radii["2xl"],
              borderTopRightRadius: theme.radii["2xl"],
              paddingHorizontal: theme.spacing.lg,
              paddingTop: theme.spacing.md,
              paddingBottom:
                Math.max(insets.bottom, theme.spacing.md) + theme.spacing.sm,
              shadowColor: "#000",
              shadowOpacity: 0.25,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: -4 },
              elevation: 16,
            }}
          >
            <View style={{ alignItems: "center", marginBottom: theme.spacing.md }}>
              <View
                style={{
                  width: 40,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: theme.colors.borderStrong,
                }}
              />
            </View>
            {title ? (
              <Text
                variant="heading"
                align="center"
                style={{ marginBottom: message ? 4 : theme.spacing.md }}
              >
                {title}
              </Text>
            ) : null}
            {message ? (
              <Text
                variant="caption"
                tone="muted"
                align="center"
                style={{ marginBottom: theme.spacing.md }}
              >
                {message}
              </Text>
            ) : null}
            <View style={{ gap: 4 }}>
              {options.map((opt, i) => (
                <Pressable
                  key={opt.key ?? `${i}-${opt.label}`}
                  onPress={() => handleSelect(opt)}
                  android_ripple={{ color: theme.colors.surfaceAlt }}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: theme.spacing.md,
                    paddingVertical: theme.spacing.md,
                    paddingHorizontal: theme.spacing.md,
                    borderRadius: theme.radii.md,
                    backgroundColor: pressed
                      ? theme.colors.surfaceAlt
                      : "transparent",
                  })}
                >
                  {opt.icon ? (
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: opt.destructive
                          ? theme.colors.negativeSoft
                          : theme.colors.surfaceAlt,
                      }}
                    >
                      <Ionicons
                        name={opt.icon}
                        size={18}
                        color={
                          opt.destructive
                            ? theme.colors.negative
                            : theme.colors.text
                        }
                      />
                    </View>
                  ) : null}
                  <View style={{ flex: 1 }}>
                    <Text
                      variant="bodyMedium"
                      style={{
                        color: opt.destructive
                          ? theme.colors.negative
                          : theme.colors.text,
                        fontFamily: "Inter_600SemiBold",
                      }}
                    >
                      {opt.label}
                    </Text>
                    {opt.description ? (
                      <Text variant="caption" tone="muted">
                        {opt.description}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </View>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => ({
                marginTop: theme.spacing.sm,
                paddingVertical: theme.spacing.md,
                alignItems: "center",
                borderRadius: theme.radii.md,
                backgroundColor: pressed
                  ? theme.colors.surfaceAlt
                  : "transparent",
              })}
            >
              <Text
                variant="bodyMedium"
                tone="muted"
                style={{ fontFamily: "Inter_600SemiBold" }}
              >
                Cancel
              </Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
