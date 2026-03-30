import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "../constants/theme";

type ChipOption<T extends string = string> = {
  value: T;
  label: string;
  /** Optional custom active color (defaults to accent) */
  color?: string;
};

type ChipGroupProps<T extends string = string> = {
  options: ChipOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
};

export function ChipGroup<T extends string = string>({
  options,
  selected,
  onSelect,
}: ChipGroupProps<T>) {
  return (
    <View style={styles.row}>
      {options.map((opt) => {
        const isActive = selected === opt.value;
        const activeColor = opt.color || COLORS.accent;

        return (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.chip,
              isActive && {
                backgroundColor: activeColor + "15",
                borderColor: activeColor,
              },
            ]}
            onPress={() => onSelect(opt.value)}
          >
            <Text
              style={[
                styles.chipText,
                isActive && { color: activeColor, fontWeight: "600" },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  chipText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
});
