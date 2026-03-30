import React from "react";
import { Text, StyleSheet } from "react-native";
import { COLORS, SPACING, FONT_SIZES } from "../constants/theme";

type SectionHeaderProps = {
  title: string;
};

export function SectionHeader({ title }: SectionHeaderProps) {
  return <Text style={styles.header}>{title}</Text>;
}

const styles = StyleSheet.create({
  header: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: SPACING.md,
  },
});
