import { View } from "react-native";
import { useTheme } from "@/theme";
import { Text } from "./Text";

export interface BarChartDatum {
  key: string;
  label: string;
  value: number;
  formattedValue?: string;
  color?: string;
  caption?: string;
  emoji?: string;
}

interface BarChartProps {
  data: BarChartDatum[];
  max?: number;
  accent?: string;
}

export function BarChart({ data, max, accent }: BarChartProps) {
  const theme = useTheme();
  const computedMax = max ?? Math.max(1, ...data.map((d) => d.value));
  const barColor = accent ?? theme.colors.accent;

  if (data.length === 0) return null;

  return (
    <View style={{ gap: theme.spacing.md }}>
      {data.map((d) => {
        const pct = Math.max(0.02, d.value / computedMax);
        return (
          <View key={d.key} style={{ gap: 6 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              {d.emoji ? (
                <Text style={{ fontSize: 16, lineHeight: 20 }}>{d.emoji}</Text>
              ) : null}
              <Text
                variant="bodyMedium"
                style={{ flex: 1 }}
                numberOfLines={1}
              >
                {d.label}
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_700Bold",
                  fontSize: 14,
                  color: theme.colors.text,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {d.formattedValue ?? String(d.value)}
              </Text>
            </View>
            <View
              style={{
                height: 10,
                borderRadius: 5,
                backgroundColor: theme.colors.surfaceAlt,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height: "100%",
                  width: `${pct * 100}%`,
                  borderRadius: 5,
                  backgroundColor: d.color ?? barColor,
                }}
              />
            </View>
            {d.caption ? (
              <Text variant="caption" tone="subtle">
                {d.caption}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
