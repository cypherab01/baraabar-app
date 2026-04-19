export type ColorScheme = "light" | "dark";

export interface Palette {
  bg: string;
  bgElevated: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  accent: string;
  accentSoft: string;
  accentText: string;
  positive: string;
  positiveSoft: string;
  negative: string;
  negativeSoft: string;
  warning: string;
  shadow: string;
  overlay: string;
}

const lightPalette: Palette = {
  bg: "#F7F7F5",
  bgElevated: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceAlt: "#F1F1EE",
  border: "#ECECE8",
  borderStrong: "#D7D7D2",
  text: "#17171A",
  textMuted: "#5C5C63",
  textSubtle: "#90909A",
  accent: "#4C6FFF",
  accentSoft: "#E6ECFF",
  accentText: "#FFFFFF",
  positive: "#1F9D55",
  positiveSoft: "#E3F5EB",
  negative: "#D0453A",
  negativeSoft: "#FCE8E6",
  warning: "#C28A00",
  shadow: "rgba(16, 17, 27, 0.06)",
  overlay: "rgba(12, 12, 18, 0.45)",
};

const darkPalette: Palette = {
  bg: "#0D0D10",
  bgElevated: "#16161B",
  surface: "#1B1B21",
  surfaceAlt: "#22222A",
  border: "#2A2A33",
  borderStrong: "#3A3A46",
  text: "#F4F4F6",
  textMuted: "#9E9EA8",
  textSubtle: "#6A6A75",
  accent: "#7A93FF",
  accentSoft: "#22284A",
  accentText: "#0B0B10",
  positive: "#4FD98A",
  positiveSoft: "#153025",
  negative: "#FF7A6F",
  negativeSoft: "#33191A",
  warning: "#E7B84E",
  shadow: "rgba(0, 0, 0, 0.5)",
  overlay: "rgba(0, 0, 0, 0.6)",
};

export const palettes: Record<ColorScheme, Palette> = {
  light: lightPalette,
  dark: darkPalette,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 56,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  pill: 999,
} as const;

export const fontFamily = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
} as const;

export const typography = {
  display: {
    fontFamily: fontFamily.bold,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -1,
  },
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  heading: {
    fontFamily: fontFamily.semibold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  subheading: {
    fontFamily: fontFamily.medium,
    fontSize: 16,
    lineHeight: 22,
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  bodyMedium: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    lineHeight: 22,
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.1,
  },
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  overline: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  mono: {
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    lineHeight: 20,
    fontVariant: ["tabular-nums"],
  },
} as const;

export type Typography = typeof typography;
export type Spacing = typeof spacing;
export type Radii = typeof radii;

export interface Theme {
  scheme: ColorScheme;
  colors: Palette;
  spacing: Spacing;
  radii: Radii;
  typography: Typography;
}

export const buildTheme = (scheme: ColorScheme): Theme => ({
  scheme,
  colors: palettes[scheme],
  spacing,
  radii,
  typography,
});
