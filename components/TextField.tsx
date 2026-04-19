import React, { forwardRef, useState } from "react";
import {
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { useTheme } from "@/theme";
import { Text } from "./Text";

export interface TextFieldProps extends TextInputProps {
  label?: string;
  hint?: string;
  error?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  containerStyle?: ViewStyle | ViewStyle[];
}

export const TextField = forwardRef<TextInput, TextFieldProps>(
  (
    {
      label,
      hint,
      error,
      leading,
      trailing,
      containerStyle,
      style,
      onFocus,
      onBlur,
      ...rest
    },
    ref,
  ) => {
    const theme = useTheme();
    const [focused, setFocused] = useState(false);

    const borderColor = error
      ? theme.colors.negative
      : focused
        ? theme.colors.accent
        : theme.colors.border;

    return (
      <View style={StyleSheet.flatten([{ gap: 6 }, containerStyle])}>
        {label ? (
          <Text variant="label" tone="muted">
            {label}
          </Text>
        ) : null}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1,
            borderColor,
            borderRadius: theme.radii.md,
            backgroundColor: theme.colors.surface,
            paddingHorizontal: 14,
            minHeight: 48,
          }}
        >
          {leading ? <View style={{ marginRight: 8 }}>{leading}</View> : null}
          <TextInput
            ref={ref}
            {...rest}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            placeholderTextColor={theme.colors.textSubtle}
            style={StyleSheet.flatten([
              {
                flex: 1,
                color: theme.colors.text,
                fontFamily: "Inter_500Medium",
                fontSize: 15,
                paddingVertical: 12,
              },
              style,
            ])}
          />
          {trailing ? <View style={{ marginLeft: 8 }}>{trailing}</View> : null}
        </View>
        {error ? (
          <Text variant="caption" tone="negative">
            {error}
          </Text>
        ) : hint ? (
          <Text variant="caption" tone="subtle">
            {hint}
          </Text>
        ) : null}
      </View>
    );
  },
);

TextField.displayName = "TextField";
