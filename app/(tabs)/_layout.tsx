import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme";

const TAB_BAR_HEIGHT = 60;

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textSubtle,
        tabBarLabelStyle: {
          fontFamily: "Inter_600SemiBold",
          fontSize: 11,
          marginTop: 2,
          marginBottom: Platform.OS === "android" ? 2 : 0,
        },
        tabBarItemStyle: { paddingVertical: 6 },
        tabBarStyle: {
          height: TAB_BAR_HEIGHT + bottomPad,
          paddingBottom: bottomPad,
          paddingTop: 6,
          backgroundColor: theme.colors.bgElevated,
          borderTopWidth: 0.5,
          borderTopColor: theme.colors.border,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarBackground: () => (
          <View
            style={{
              flex: 1,
              backgroundColor: theme.colors.bgElevated,
            }}
          />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Trips",
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? "briefcase" : "briefcase-outline"}
              size={size ?? 22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="compare"
        options={{
          title: "Compare",
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? "stats-chart" : "stats-chart-outline"}
              size={size ?? 22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={
                focused
                  ? "ellipsis-horizontal-circle"
                  : "ellipsis-horizontal-circle-outline"
              }
              size={size ?? 24}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
