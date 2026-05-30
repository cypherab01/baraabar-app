import { View } from "react-native";
import { useCategoriesById } from "@/hooks/useCategories";
import { useTheme } from "@/theme";
import { Text } from "./Text";

const ACCENT_TINT: Record<"light" | "dark", string> = {
  light: "#E6ECFF",
  dark: "#22284A",
};

interface CategoryIconProps {
  categoryId: string;
  size?: number;
}

export function CategoryIcon({ categoryId, size = 36 }: CategoryIconProps) {
  const theme = useTheme();
  const byId = useCategoriesById();
  const cat = byId.get(categoryId);
  const emoji = cat?.emoji ?? "•";
  const bg = ACCENT_TINT[theme.scheme];

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
    </View>
  );
}
