import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { AppHeader } from "@/components/AppHeader";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { DEVELOPER, type SocialLink } from "@/constants/developer";
import { useTheme } from "@/theme";

const SOCIAL_ICON: Record<SocialLink["key"], React.ComponentProps<typeof Ionicons>["name"]> = {
  github: "logo-github",
  linkedin: "logo-linkedin",
  instagram: "logo-instagram",
  facebook: "logo-facebook",
  twitter: "logo-twitter",
};

export default function AboutScreen() {
  const theme = useTheme();

  const openURL = async (url: string) => {
    if (!url) {
      Alert.alert("Coming soon", "This link will be available in a future update.");
      return;
    }
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else Alert.alert("Can't open link", url);
    } catch {
      Alert.alert("Can't open link", url);
    }
  };

  return (
    <Screen edges={["top", "left", "right"]}>
      <AppHeader title="Developer info" subtitle="Who built Baraabar" showBack />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: theme.spacing["4xl"],
          gap: theme.spacing.lg,
        }}
      >
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="overline" tone="subtle">
            Developer
          </Text>
          <Card padded>
            <Text variant="heading" numberOfLines={1}>
              {DEVELOPER.name}
            </Text>
            <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
              {DEVELOPER.role}
              {DEVELOPER.location ? ` · ${DEVELOPER.location}` : ""}
            </Text>

            {DEVELOPER.bio ? (
              <Text
                variant="body"
                tone="muted"
                style={{ marginTop: theme.spacing.md }}
              >
                {DEVELOPER.bio}
              </Text>
            ) : null}

            <View
              style={{
                marginTop: theme.spacing.lg,
                gap: 0,
                borderTopWidth: 1,
                borderTopColor: theme.colors.border,
              }}
            >
              <ContactRow
                icon="mail-outline"
                label="Email"
                value={DEVELOPER.email}
                onPress={() => openURL(`mailto:${DEVELOPER.email}`)}
              />
              {DEVELOPER.phone ? (
                <ContactRow
                  icon="call-outline"
                  label="Phone"
                  value={DEVELOPER.phone}
                  onPress={() =>
                    openURL(`tel:${DEVELOPER.phone!.replace(/\s+/g, "")}`)
                  }
                />
              ) : null}
            </View>

            <View style={{ marginTop: theme.spacing.lg }}>
              <Text variant="overline" tone="subtle">
                Find me on
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 10,
                  marginTop: theme.spacing.sm,
                }}
              >
                {DEVELOPER.socials.map((s) => (
                  <Pressable
                    key={s.key}
                    onPress={() => openURL(s.url)}
                    android_ripple={{ color: theme.colors.accentSoft }}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: theme.radii.pill,
                      backgroundColor: theme.colors.surfaceAlt,
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <Ionicons
                      name={SOCIAL_ICON[s.key]}
                      size={16}
                      color={theme.colors.text}
                    />
                    <Text
                      variant="label"
                      style={{ fontFamily: "Inter_600SemiBold" }}
                    >
                      {s.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </Card>
        </View>

        <Text
          variant="caption"
          tone="subtle"
          align="center"
          style={{ marginTop: theme.spacing.sm }}
        >
          Baraabar · ठ्याक्कै बराबर · Made with care in Nepal
        </Text>
      </ScrollView>
    </Screen>
  );
}

function ContactRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: theme.colors.surfaceAlt }}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: pressed ? theme.colors.surfaceAlt : "transparent",
      })}
    >
      <Ionicons name={icon} size={18} color={theme.colors.textMuted} />
      <View style={{ flex: 1 }}>
        <Text variant="caption" tone="muted">
          {label}
        </Text>
        <Text variant="bodyMedium">{value}</Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={16}
        color={theme.colors.textSubtle}
      />
    </Pressable>
  );
}
