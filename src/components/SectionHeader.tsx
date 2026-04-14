import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "../constants/theme";

type SectionHeaderProps = {
  title: string;
  count?: number;
};

export function SectionHeader({ title, count }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.accent} />
      <Text style={styles.header}>{title}</Text>
      {count !== undefined && (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  accent: {
    width: 3,
    height: 16,
    backgroundColor: COLORS.accent,
    borderRadius: 2,
    marginRight: SPACING.sm,
  },
  header: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "800",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    flex: 1,
  },
  countBadge: {
    backgroundColor: COLORS.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  countText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "700",
    color: COLORS.accent,
  },
});
