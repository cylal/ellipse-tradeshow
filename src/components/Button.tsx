import React from "react";
import {
  TouchableOpacity, Text, ActivityIndicator,
  StyleSheet, ViewStyle,
} from "react-native";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from "../constants/theme";

type ButtonVariant = "primary" | "danger" | "outline" | "ghost";

type ButtonProps = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  style?: ViewStyle;
  icon?: React.ReactNode;
};

const VARIANT_STYLES: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
  primary: { bg: COLORS.accent, text: COLORS.textInverse },
  danger: { bg: COLORS.errorLight, text: COLORS.error, border: COLORS.error + "40" },
  outline: { bg: "transparent", text: COLORS.accent, border: COLORS.accent + "50" },
  ghost: { bg: "transparent", text: COLORS.textSecondary },
};

export function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
  style,
  icon,
}: ButtonProps) {
  const v = VARIANT_STYLES[variant];

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: v.bg },
        v.border && { borderWidth: 1.5, borderColor: v.border },
        variant === "primary" && SHADOWS.glow,
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
        <>
          {icon}
          <Text style={[styles.buttonText, { color: v.text }, icon && { marginLeft: 8 }]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 14,
    paddingHorizontal: SPACING.xl,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  disabled: {
    opacity: 0.5,
  },
});
