import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import {
  DarkTheme as NavDarkTheme,
  DefaultTheme as NavDefaultTheme,
  ThemeProvider as NavThemeProvider,
  type Theme as NavTheme,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  categoriesStore,
  seedDefaultCategoriesIfEmpty,
} from "@/storage/categoriesStore";
import { migrationsStore, runV1Migration } from "@/storage/migrations";
import { personsStore } from "@/storage/personsStore";
import { settingsStore } from "@/storage/settingsStore";
import { tripsStore } from "@/storage/tripsStore";
import { ThemeProvider, useTheme } from "@/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootStack() {
  const theme = useTheme();

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.bg).catch(() => {});
  }, [theme.colors.bg]);

  const navTheme: NavTheme = useMemo(() => {
    const base = theme.scheme === "dark" ? NavDarkTheme : NavDefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: theme.colors.bg,
        card: theme.colors.bg,
        border: theme.colors.border,
        text: theme.colors.text,
        primary: theme.colors.accent,
      },
    };
  }, [theme]);

  return (
    <NavThemeProvider value={navTheme}>
      <StatusBar style={theme.scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.bg },
          animation: "slide_from_right",
          animationTypeForReplace: "pop",
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="trip/new" options={{ presentation: "modal" }} />
        <Stack.Screen name="trip/[id]" />
        <Stack.Screen
          name="trip/[id]/members"
          options={{ presentation: "modal" }}
        />
        <Stack.Screen
          name="trip/[id]/expense/new"
          options={{ presentation: "modal" }}
        />
        <Stack.Screen
          name="trip/[id]/expense/[expenseId]"
          options={{ presentation: "modal" }}
        />
      </Stack>
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.all([
        tripsStore.ready,
        personsStore.ready,
        categoriesStore.ready,
        settingsStore.ready,
        migrationsStore.ready,
      ]);
      seedDefaultCategoriesIfEmpty();
      try {
        await runV1Migration();
      } catch (err) {
        console.warn("[bootstrap] v1 migration failed", err);
      }
      if (!cancelled) setBootstrapped(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const ready = (fontsLoaded || fontError) && bootstrapped;

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <ThemeProvider>
            <RootStack />
          </ThemeProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
