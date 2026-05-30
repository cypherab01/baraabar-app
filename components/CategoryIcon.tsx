import { View } from "react-native";
import { useCategoriesById } from "@/hooks/useCategories";
import { useTheme } from "@/theme";
import { Text } from "./Text";

interface CategoryIconProps {
  categoryId: string;
  size?: number;
}

export function CategoryIcon({ categoryId, size = 36 }: CategoryIconProps) {
  const theme = useTheme();
  const byId = useCategoriesById();
  const cat = byId.get(categoryId);
  const emoji = cat?.emoji ?? "•";

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: theme.colors.accentSoft,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
    </View>
  );
}
