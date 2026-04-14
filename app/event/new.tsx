import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useEventStore } from "../../src/stores/eventStore";
import { ChipGroup, Button, Input, DatePicker } from "../../src/components";
import { COLORS, SPACING, FONT_SIZES } from "../../src/constants/theme";
import { format } from "date-fns";
import type { Region } from "../../src/types";

const REGIONS: { value: Region; label: string }[] = [
  { value: "NORAM", label: "North America" },
  { value: "EMEA", label: "EMEA" },
  { value: "APAC", label: "Asia Pacific" },
  { value: "LATAM", label: "Latin America" },
];

export default function NewEventScreen() {
  const router = useRouter();
  const { createEvent } = useEventStore();

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [boothNumber, setBoothNumber] = useState("");
  const [description, setDescription] = useState("");
  const [region, setRegion] = useState<Region>("EMEA");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Event name is required.");
      return;
    }
    if (!startDate || !endDate) {
      Alert.alert("Error", "Start and end dates are required.");
      return;
    }
    if (endDate < startDate) {
      Alert.alert("Error", "End date must be after start date.");
      return;
    }

    setSaving(true);
    try {
      const event = await createEvent({
        name: name.trim(),
        location: location.trim() || undefined,
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd"),
        boothNumber: boothNumber.trim() || undefined,
        description: description.trim() || undefined,
        region,
      });
      Alert.alert("Event Created", `"${event.name}" has been created successfully.`, [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      const msg =
        typeof err?.message === "string"
          ? err.message
          : "Unable to create event. Check your connection.";
      Alert.alert("Error", msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Input
        label="Event Name *"
        placeholder="Ex: CES 2026, MWC Barcelona"
        value={name}
        onChangeText={setName}
      />

      <Input
        label="Location"
        placeholder="Ex: Las Vegas, NV"
        value={location}
        onChangeText={setLocation}
      />

      <View style={styles.row}>
        <View style={styles.halfField}>
          <DatePicker
            label="Start Date *"
            value={startDate}
            onChange={setStartDate}
            placeholder="Start"
          />
        </View>
        <View style={styles.halfField}>
          <DatePicker
            label="End Date *"
            value={endDate}
            onChange={setEndDate}
            placeholder="End"
            minimumDate={startDate || undefined}
          />
        </View>
      </View>

      <Input
        label="Booth Number"
        placeholder="Ex: Hall 5, Stand B42"
        value={boothNumber}
        onChangeText={setBoothNumber}
      />

      <Text style={styles.label}>Region</Text>
      <ChipGroup
        options={REGIONS}
        selected={region}
        onSelect={(v) => setRegion(v as Region)}
      />

      <Input
        label="Description"
        placeholder="Description, event objectives..."
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
      />

      <Button
        title="Create Event"
        onPress={handleCreate}
        loading={saving}
        style={{ marginTop: SPACING.xxl }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: 60 },
  row: { flexDirection: "row", gap: SPACING.md },
  halfField: { flex: 1 },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
});
