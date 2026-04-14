import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SPACING, FONT_SIZES, BORDER_RADIUS } from "../constants/theme";

type BadgeProps = {
  label: string;
  bg: string;
  color: string;
  icon?: string;
};

export function Badge({ label, bg, color, icon }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {icon && <Text style={{ fontSize: 10, marginRight: 3 }}>{icon}</Text>}
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

/** Preconfigured status badges for events */
const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string; icon: string }> = {
  upcoming: { bg: "#eef2ff", text: "#4f46e5", label: "Upcoming", icon: "◉" },
  active: { bg: "#d1fae5", text: "#059669", label: "In Progress", icon: "●" },
  completed: { bg: "#f1f5f9", text: "#64748b", label: "Completed", icon: "✓" },
};

export function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.upcoming;
  return <Badge label={c.label} bg={c.bg} color={c.text} icon={c.icon} />;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full,
  },
  text: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
