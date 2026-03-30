import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useEventStore } from "../../src/stores/eventStore";
import { ChipGroup, Button, Input } from "../../src/components";
import { COLORS, SPACING, FONT_SIZES } from "../../src/constants/theme";
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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [boothNumber, setBoothNumber] = useState("");
  const [description, setDescription] = useState("");
  const [region, setRegion] = useState<Region>("EMEA");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert("Erreur", "Le nom du salon est requis.");
      return;
    }
    if (!startDate || !endDate) {
      Alert.alert("Erreur", "Les dates de début et fin sont requises (format: YYYY-MM-DD).");
      return;
    }

    setSaving(true);
    try {
      const event = await createEvent({
        name: name.trim(),
        location: location.trim() || undefined,
        startDate,
        endDate,
        boothNumber: boothNumber.trim() || undefined,
        description: description.trim() || undefined,
        region,
      });
      Alert.alert("Salon créé", `"${event.name}" a été créé avec succès.`, [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert("Erreur", err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Input
        label="Nom du salon *"
        placeholder="Ex: CES 2026, MWC Barcelona"
        value={name}
        onChangeText={setName}
      />

      <Input
        label="Lieu"
        placeholder="Ex: Las Vegas, NV"
        value={location}
        onChangeText={setLocation}
      />

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Input
            label="Date début *"
            placeholder="YYYY-MM-DD"
            value={startDate}
            onChangeText={setStartDate}
          />
        </View>
        <View style={styles.halfField}>
          <Input
            label="Date fin *"
            placeholder="YYYY-MM-DD"
            value={endDate}
            onChangeText={setEndDate}
          />
        </View>
      </View>

      <Input
        label="N° de stand"
        placeholder="Ex: Hall 5, Stand B42"
        value={boothNumber}
        onChangeText={setBoothNumber}
      />

      <Text style={styles.label}>Région</Text>
      <ChipGroup
        options={REGIONS}
        selected={region}
        onSelect={(v) => setRegion(v as Region)}
      />

      <Input
        label="Description"
        placeholder="Description, objectifs du salon..."
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
      />

      <Button
        title="Créer le salon"
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
