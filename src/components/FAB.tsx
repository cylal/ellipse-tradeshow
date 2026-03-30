import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { COLORS, SHADOWS } from "../constants/theme";

type FABProps = {
  onPress: () => void;
  icon?: string;
};

export function FAB({ onPress, icon = "+" }: FABProps) {
  return (
    <TouchableOpacity style={styles.fab} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.fabText}>{icon}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.lg,
  },
  fabText: {
    fontSize: 28,
    color: COLORS.textInverse,
    lineHeight: 30,
  },
});
