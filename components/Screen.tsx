import { StyleSheet, View, type ViewProps, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme";

type Edge = "top" | "bottom" | "left" | "right";

interface ScreenProps extends ViewProps {
  padded?: boolean;
  edges?: Edge[];
  style?: ViewStyle | ViewStyle[];
}

export function Screen({
  padded = true,
  edges = ["top", "bottom", "left", "right"],
  style,
  children,
  ...rest
}: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const horizontal = padded ? theme.spacing.xl : 0;
  const pad: ViewStyle = {
    paddingTop: edges.includes("top") ? insets.top : 0,
    paddingBottom: edges.includes("bottom") ? insets.bottom : 0,
    paddingLeft: Math.max(
      edges.includes("left") ? insets.left : 0,
      horizontal,
    ),
    paddingRight: Math.max(
      edges.includes("right") ? insets.right : 0,
      horizontal,
    ),
  };
  return (
    <View
      {...rest}
      style={StyleSheet.flatten([
        { flex: 1, backgroundColor: theme.colors.bg },
        pad,
        style,
      ])}
    >
      {children}
    </View>
  );
}
