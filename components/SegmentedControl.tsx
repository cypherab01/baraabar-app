import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "@/theme";
import { Text } from "./Text";

interface Segment<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: theme.radii.pill,
        padding: 4,
        gap: 2,
      }}
    >
      {segments.map((s) => {
        const active = s.value === value;
        return (
          <Pressable
            key={s.value}
            onPress={() => {
              if (!active) Haptics.selectionAsync().catch(() => {});
              onChange(s.value);
            }}
            style={StyleSheet.flatten([
              {
                flex: 1,
                height: 36,
                borderRadius: theme.radii.pill,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: active ? theme.colors.surface : "transparent",
              },
              active && theme.scheme === "light"
                ? {
                    shadowColor: "#000",
                    shadowOpacity: 0.06,
                    shadowRadius: 4,
                    shadowOffset: { width: 0, height: 1 },
                    elevation: 1,
                  }
                : null,
            ])}
          >
            <Text
              variant="label"
              style={{
                color: active ? theme.colors.text : theme.colors.textMuted,
                fontFamily: "Inter_600SemiBold",
              }}
            >
              {s.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
