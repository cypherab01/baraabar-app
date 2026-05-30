import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Pressable, ScrollView, View } from "react-native";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { useSettings } from "@/hooks/useSettings";
import { setThemeMode } from "@/storage/settingsStore";
import { useTheme } from "@/theme";
import type { AppSettings } from "@/types/models";

const MODES: { value: AppSettings["themeMode"]; label: string; description: string }[] = [
  { value: "system", label: "System", description: "Follow your phone's setting" },
  { value: "light", label: "Light", description: "Always light" },
  { value: "dark", label: "Dark", description: "Always dark" },
];

export default function ThemeScreen() {
  const theme = useTheme();
  const { themeMode } = useSettings();

  const pick = (mode: AppSettings["themeMode"]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setThemeMode(mode);
  };

  return (
    <Screen>
      <AppHeader title="Theme" showBack />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: theme.spacing.lg }}
      >
        <View
          style={{
            flexDirection: "row",
            gap: theme.spacing.sm,
            paddingVertical: theme.spacing.md,
          }}
        >
          <Swatch color={theme.colors.bg} label="bg" />
          <Swatch color={theme.colors.surface} label="surface" />
          <Swatch color={theme.colors.accent} label="accent" />
        </View>

        <Card padded={false}>
          {MODES.map((m, i) => {
            const active = m.value === themeMode;
            return (
              <Pressable
                key={m.value}
                onPress={() => pick(m.value)}
                android_ripple={{ color: theme.colors.accentSoft }}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: theme.spacing.md,
                  paddingVertical: theme.spacing.md,
                  paddingHorizontal: theme.spacing.md,
                  backgroundColor: pressed
                    ? theme.colors.surfaceAlt
                    : "transparent",
                  borderBottomWidth: i < MODES.length - 1 ? 0.5 : 0,
                  borderBottomColor: theme.colors.border,
                })}
              >
                <View style={{ flex: 1 }}>
                  <Text>{m.label}</Text>
                  <Text variant="caption" tone="muted">
                    {m.description}
                  </Text>
                </View>
                {active ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color={theme.colors.accent}
                  />
                ) : (
                  <Ionicons
                    name="ellipse-outline"
                    size={22}
                    color={theme.colors.textSubtle}
                  />
                )}
              </Pressable>
            );
          })}
        </Card>
      </ScrollView>
    </Screen>
  );
}

function Swatch({ color, label }: { color: string; label: string }) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: "center", gap: 6 }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: theme.radii.md,
          backgroundColor: color,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}
      />
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  );
}
