import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SPACING, FONT_SIZES, BORDER_RADIUS } from "../constants/theme";

type BadgeProps = {
  label: string;
  bg: string;
  color: string;
};

export function Badge({ label, bg, color }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

/** Preconfigured status badges for events */
const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  upcoming: { bg: "#dbeafe", text: "#1d4ed8", label: "À venir" },
  active: { bg: "#dcfce7", text: "#15803d", label: "En cours" },
  completed: { bg: "#f1f5f9", text: "#64748b", label: "Terminé" },
};

export function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.upcoming;
  return <Badge label={c.label} bg={c.bg} color={c.text} />;
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.full,
  },
  text: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "600",
  },
});
