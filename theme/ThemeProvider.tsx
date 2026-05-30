import React, { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";
import { useSettings } from "@/hooks/useSettings";
import { buildTheme, type ColorScheme, type Theme } from "./tokens";

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const { themeMode } = useSettings();
  const scheme: ColorScheme =
    themeMode === "system" ? (systemScheme === "dark" ? "dark" : "light") : themeMode;
  const theme = useMemo(() => buildTheme(scheme), [scheme]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return theme;
}
