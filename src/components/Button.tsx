import React from "react";
import {
  TouchableOpacity, Text, ActivityIndicator,
  StyleSheet, ViewStyle, TextStyle,
} from "react-native";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from "../constants/theme";

type ButtonVariant = "primary" | "danger" | "outline";

type ButtonProps = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  style?: ViewStyle;
};

const VARIANT_STYLES: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
  primary: { bg: COLORS.accent, text: COLORS.textInverse },
  danger: { bg: COLORS.error + "10", text: COLORS.error, border: COLORS.error + "30" },
  outline: { bg: "transparent", text: COLORS.accent, border: COLORS.accent },
};

export function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
  style,
}: ButtonProps) {
  const v = VARIANT_STYLES[variant];

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: v.bg },
        v.border && { borderWidth: 1, borderColor: v.border },
        variant === "primary" && SHADOWS.md,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={v.text} />
      ) : (
        <Text style={[styles.buttonText, { color: v.text }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    alignItems: "center",
  },
  buttonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.6,
  },
});
