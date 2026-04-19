import { View, type ViewStyle } from "react-native";
import { initialsOf } from "@/lib/format";
import { useTheme } from "@/theme";
import { Text } from "./Text";

const PALETTE = [
  { bg: "#FFE4CC", fg: "#7A4515" },
  { bg: "#D9EAD3", fg: "#2F5D2A" },
  { bg: "#DDE4FF", fg: "#1F306E" },
  { bg: "#FFD6E5", fg: "#7A1F45" },
  { bg: "#E9D6FF", fg: "#46206E" },
  { bg: "#CFE9F4", fg: "#1F506E" },
  { bg: "#F9E4A3", fg: "#6E4F05" },
  { bg: "#E4F1D1", fg: "#3D5C12" },
];

const DARK_PALETTE = [
  { bg: "#3A2918", fg: "#F8C893" },
  { bg: "#1F3320", fg: "#B8E0AE" },
  { bg: "#1F2740", fg: "#B9CAFF" },
  { bg: "#3A1F2B", fg: "#FFB7D0" },
  { bg: "#2C1F40", fg: "#D0B6FF" },
  { bg: "#152B36", fg: "#9CD0EB" },
  { bg: "#362C12", fg: "#F0D37E" },
  { bg: "#25321A", fg: "#C9E29E" },
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

interface MemberAvatarProps {
  name: string;
  seed?: string;
  size?: number;
  style?: ViewStyle;
}

export function MemberAvatar({ name, seed, size = 32, style }: MemberAvatarProps) {
  const theme = useTheme();
  const palette = theme.scheme === "dark" ? DARK_PALETTE : PALETTE;
  const color = palette[hash(seed ?? name) % palette.length];
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color.bg,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Text
        style={{
          color: color.fg,
          fontFamily: "Inter_600SemiBold",
          fontSize: Math.round(size * 0.38),
          lineHeight: Math.round(size * 0.5),
        }}
      >
        {initialsOf(name)}
      </Text>
    </View>
  );
}
