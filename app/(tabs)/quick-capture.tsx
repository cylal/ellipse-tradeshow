import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useEventStore } from "../../src/stores/eventStore";
import { Card, ChipGroup, Button, Input } from "../../src/components";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from "../../src/constants/theme";
import { CONFIG } from "../../src/constants/config";
import type { TradeShowEvent, EncounterParticipant, EncounterType, CaptureMode } from "../../src/types";

export default function QuickCaptureScreen() {
  const router = useRouter();
  const { events, activeEvent, fetchEvents, createEncounter, setActiveEvent } = useEventStore();

  const [selectedEvent, setSelectedEvent] = useState<TradeShowEvent | null>(activeEvent);
  const [title, setTitle] = useState("");
  const [encounterType, setEncounterType] = useState<EncounterType>("meeting");
  const [manualNotes, setManualNotes] = useState("");
  const [participants, setParticipants] = useState<EncounterParticipant[]>([]);
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchEvents({ status: "active" });
  }, []);

  useEffect(() => {
    if (!selectedEvent && events.length > 0) {
      const active = events.find((e) => e.status === "active");
      if (active) setSelectedEvent(active);
    }
  }, [events]);

  const handleSave = async () => {
    if (!selectedEvent) {
      Alert.alert("Erreur", "Veuillez sélectionner un salon.");
      return;
    }
    if (!title.trim()) {
      Alert.alert("Erreur", "Veuillez donner un titre à la rencontre.");
      return;
    }

    setIsSaving(true);
    try {
      await createEncounter(selectedEvent.id, {
        title: title.trim(),
        encounterType,
        timestamp: new Date().toISOString(),
        participants,
        captureMode: "manual" as CaptureMode,
        manualNotes: manualNotes.trim() || undefined,
        priority,
      });
      Alert.alert("Succès", "Rencontre enregistrée !", [
        {
          text: "OK",
          onPress: () => {
            setTitle("");
            setManualNotes("");
            setParticipants([]);
          },
        },
      ]);
    } catch (err: any) {
      Alert.alert("Erreur", err.message || "Impossible de sauvegarder.");
    } finally {
      setIsSaving(false);
    }
  };

  const encounterTypeOptions = CONFIG.ENCOUNTER_TYPES.map((t) => ({
    value: t.value,
    label: t.label,
  }));

  const priorityOptions = CONFIG.PRIORITY_OPTIONS.map((p) => ({
    value: p.value,
    label: p.label,
    color: p.color,
  }));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Event selector */}
      {selectedEvent ? (
        <TouchableOpacity
          style={styles.eventBanner}
          onPress={() => setSelectedEvent(null)}
        >
          <Text style={styles.eventBannerLabel}>Salon actif</Text>
          <Text style={styles.eventBannerName}>{selectedEvent.name}</Text>
          <Text style={styles.eventBannerChange}>Changer ▸</Text>
        </TouchableOpacity>
      ) : (
        <Card style={styles.eventPicker}>
          <Text style={styles.label}>Sélectionner un salon</Text>
          {events.map((event) => (
            <TouchableOpacity
              key={event.id}
              style={styles.eventOption}
              onPress={() => setSelectedEvent(event)}
            >
              <Text style={styles.eventOptionText}>{event.name}</Text>
              <Text style={styles.eventOptionDate}>
                {event.location} · {event.status === "active" ? "En cours" : "À venir"}
              </Text>
            </TouchableOpacity>
          ))}
        </Card>
      )}

      <Input
        label="Titre de la rencontre"
        placeholder="Ex: RDV avec Samsung — Badge OCR demo"
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Type</Text>
      <ChipGroup
        options={encounterTypeOptions}
        selected={encounterType}
        onSelect={(v) => setEncounterType(v as EncounterType)}
      />

      <Text style={styles.label}>Priorité</Text>
      <ChipGroup
        options={priorityOptions}
        selected={priority}
        onSelect={(v) => setPriority(v as any)}
      />

      {/* Quick actions */}
      <Text style={styles.label}>Actions rapides</Text>
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push("/capture/camera")}
        >
          <Text style={styles.actionIcon}>📷</Text>
          <Text style={styles.actionLabel}>Badge / Carte</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push("/capture/audio")}
        >
          <Text style={styles.actionIcon}>🎙️</Text>
          <Text style={styles.actionLabel}>Audio AI</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push("/capture/camera")}
        >
          <Text style={styles.actionIcon}>🤳</Text>
          <Text style={styles.actionLabel}>Portrait</Text>
        </TouchableOpacity>
      </View>

      <Input
        label="Notes"
        placeholder="Notes sur la rencontre, sujets abordés..."
        value={manualNotes}
        onChangeText={setManualNotes}
        multiline
        numberOfLines={5}
      />

      <Button
        title="Enregistrer la rencontre"
        onPress={handleSave}
        loading={isSaving}
        style={{ marginTop: SPACING.xl }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: 60 },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  eventBanner: {
    backgroundColor: COLORS.accent + "15",
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.accent + "30",
  },
  eventBannerLabel: { fontSize: FONT_SIZES.xs, color: COLORS.accent, fontWeight: "600" },
  eventBannerName: { fontSize: FONT_SIZES.lg, fontWeight: "700", color: COLORS.text, marginTop: 2 },
  eventBannerChange: { fontSize: FONT_SIZES.sm, color: COLORS.accent, marginTop: SPACING.xs },
  eventPicker: { padding: SPACING.lg },
  eventOption: {
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  eventOptionText: { fontSize: FONT_SIZES.md, fontWeight: "600", color: COLORS.text },
  eventOptionDate: { fontSize: FONT_SIZES.sm, color: COLORS.textMuted, marginTop: 2 },
  actionRow: { flexDirection: "row", gap: SPACING.md },
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: "center",
    ...SHADOWS.sm,
  },
  actionIcon: { fontSize: 28, marginBottom: SPACING.xs },
  actionLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, fontWeight: "500" },
});
