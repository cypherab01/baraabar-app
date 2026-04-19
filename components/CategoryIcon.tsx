import { View } from "react-native";
import { CATEGORIES, type CategoryKey } from "@/types/models";
import { useTheme } from "@/theme";
import { Text } from "./Text";

const CATEGORY_COLORS: Record<CategoryKey, { light: string; dark: string }> = {
  food: { light: "#FFECD1", dark: "#3A2918" },
  transport: { light: "#DDE8FF", dark: "#1F2A40" },
  stay: { light: "#E8DFFF", dark: "#2B1F40" },
  activities: { light: "#D8F1E0", dark: "#153025" },
  shopping: { light: "#FFD9EA", dark: "#3A1D2B" },
  other: { light: "#EEEEEC", dark: "#2A2A33" },
};

interface CategoryIconProps {
  category: CategoryKey;
  size?: number;
}

export function CategoryIcon({ category, size = 40 }: CategoryIconProps) {
  const theme = useTheme();
  const meta = CATEGORIES.find((c) => c.key === category)!;
  const bg = CATEGORY_COLORS[category][theme.scheme];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 3,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: Math.round(size * 0.5), lineHeight: Math.round(size * 0.65) }}>
        {meta.emoji}
      </Text>
    </View>
  );
}
