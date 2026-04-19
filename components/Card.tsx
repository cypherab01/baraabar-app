import { StyleSheet, View, type ViewProps, type ViewStyle } from "react-native";
import { useTheme } from "@/theme";

interface CardProps extends ViewProps {
  padded?: boolean;
  variant?: "solid" | "outline" | "flat";
  style?: ViewStyle | ViewStyle[];
}

export function Card({
  padded = true,
  variant = "solid",
  style,
  children,
  ...rest
}: CardProps) {
  const theme = useTheme();

  const base: ViewStyle = {
    borderRadius: theme.radii.lg,
  };

  const variantStyle: ViewStyle =
    variant === "outline"
      ? {
          backgroundColor: "transparent",
          borderWidth: 1,
          borderColor: theme.colors.border,
        }
      : variant === "flat"
        ? {
            backgroundColor: theme.colors.surfaceAlt,
          }
        : {
            backgroundColor: theme.colors.surface,
            borderWidth: theme.scheme === "dark" ? 1 : 0,
            borderColor: theme.colors.border,
            shadowColor: "#000",
            shadowOpacity: theme.scheme === "dark" ? 0 : 0.04,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 2 },
            elevation: theme.scheme === "dark" ? 0 : 1,
          };

  return (
    <View
      {...rest}
      style={StyleSheet.flatten([
        base,
        variantStyle,
        padded ? { padding: theme.spacing.lg } : null,
        style,
      ])}
    >
      {children}
    </View>
  );
}
