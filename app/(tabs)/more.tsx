import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { DEVELOPER } from "@/constants/developer";
import { useTheme } from "@/theme";
import * as Linking from "expo-linking";

interface RowProps {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  description?: string;
  onPress: () => void;
  destructive?: boolean;
  divider?: boolean;
}

function Row({
  icon,
  label,
  description,
  onPress,
  destructive,
  divider = true,
}: RowProps) {
  const theme = useTheme();
  const color = destructive ? theme.colors.negative : theme.colors.text;
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: theme.colors.accentSoft }}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
        backgroundColor: pressed ? theme.colors.surfaceAlt : "transparent",
        borderBottomWidth: divider ? 0.5 : 0,
        borderBottomColor: theme.colors.border,
      })}
    >
      <Ionicons name={icon} size={20} color={color} />
      <View style={{ flex: 1 }}>
        <Text style={{ color }}>{label}</Text>
        {description ? (
          <Text variant="caption" tone="muted">
            {description}
          </Text>
        ) : null}
      </View>
      {!destructive ? (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={theme.colors.textSubtle}
        />
      ) : null}
    </Pressable>
  );
}

export default function MoreScreen() {
  const theme = useTheme();
  const router = useRouter();

  const go = (path: string) => () => router.push(path as never);

  return (
    <Screen edges={["top", "left", "right"]}>
      <AppHeader title="More" subtitle="Settings & data" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: theme.spacing["4xl"],
          gap: theme.spacing.lg,
        }}
      >
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="overline" tone="subtle">
            Manage
          </Text>
          <Card padded={false}>
            <Row
              icon="people-outline"
              label="People"
              description="Friends you've shared trips with"
              onPress={go("/settings/people")}
            />
            <Row
              icon="pricetags-outline"
              label="Categories"
              description="Tag your expenses"
              onPress={go("/settings/categories")}
            />
            <Row
              icon="color-palette-outline"
              label="Theme"
              description="Light, dark, or system"
              onPress={go("/settings/theme")}
              divider={false}
            />
          </Card>
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="overline" tone="subtle">
            Data
          </Text>
          <Card padded={false}>
            <Row
              icon="archive-outline"
              label="Backup & data"
              description="Export, restore, or clear all"
              onPress={go("/settings/data")}
              divider={false}
            />
          </Card>
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="overline" tone="subtle">
            About
          </Text>
          <Card padded={false}>
            <Row
              icon="information-circle-outline"
              label="Developer info"
              description={DEVELOPER.name}
              onPress={go("/settings/about")}
            />
            <Row
              icon="shield-checkmark-outline"
              label="Privacy policy"
              description="How your data is stored"
              onPress={() => {
                Linking.openURL(DEVELOPER.privacyPolicyUrl).catch(() => {});
              }}
              divider={false}
            />
          </Card>
        </View>

      </ScrollView>
    </Screen>
  );
}
