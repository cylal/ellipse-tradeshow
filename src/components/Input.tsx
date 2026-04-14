import React, { useState, useCallback } from "react";
import { View, Text, TextInput, StyleSheet, TextInputProps, NativeSyntheticEvent, TextInputContentSizeChangeEventData } from "react-native";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "../constants/theme";

type InputProps = TextInputProps & {
  label?: string;
  multiline?: boolean;
};

export function Input({ label, multiline, style, ...props }: InputProps) {
  const [inputHeight, setInputHeight] = useState(multiline ? 120 : undefined);

  const handleContentSizeChange = useCallback(
    (e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
      if (multiline) {
        const newHeight = Math.max(120, Math.min(e.nativeEvent.contentSize.height + 24, 400));
        setInputHeight(newHeight);
      }
    },
    [multiline]
  );

  return (
    <View>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          multiline && styles.textArea,
          multiline && inputHeight ? { height: inputHeight } : undefined,
          style,
        ]}
        placeholderTextColor={COLORS.textMuted}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "auto"}
        onContentSizeChange={multiline ? handleContentSizeChange : undefined}
        scrollEnabled={multiline}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
  },
  textArea: {
    minHeight: 120,
  },
});
