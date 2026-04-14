import React from "react";
import { View, TouchableOpacity, StyleSheet, ViewStyle } from "react-native";
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from "../constants/theme";

type CardProps = {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  shadow?: "sm" | "md" | "lg";
  /** Left border accent color */
  accentColor?: string;
  /** Glass morphism feel — lighter bg with border */
  glass?: boolean;
};

export function Card({ children, onPress, style, shadow = "sm", accentColor, glass }: CardProps) {
  const cardStyle = [
    styles.card,
    SHADOWS[shadow],
    accentColor && { borderLeftWidth: 4, borderLeftColor: accentColor },
    glass && styles.glass,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity style={cardStyle} onPress={onPress} activeOpacity={0.7}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  glass: {
    backgroundColor: "rgba(255,255,255,0.85)",
    borderColor: COLORS.borderAccent,
  },
});
