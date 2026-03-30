import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, Alert,
} from "react-native";
import { useEventStore } from "../../src/stores/eventStore";
import { Card, Button, SectionHeader } from "../../src/components";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "../../src/constants/theme";

export default function SyncScreen() {
  const { events, encounters, activeEvent, fetchEvents, fetchEncounters, bulkSync, isLoading } = useEventStore();
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const activeEvents = events.filter((e) => e.status === "active" || e.status === "upcoming");
  const selectedEvent = activeEvent || activeEvents[0];

  useEffect(() => {
    if (selectedEvent) {
      fetchEncounters(selectedEvent.id);
    }
  }, [selectedEvent?.id]);

  const pendingEncounters = encounters.filter((e) => !e.syncedToCrm);
  const syncedEncounters = encounters.filter((e) => e.syncedToCrm);

  const handleBulkSync = async () => {
    if (!selectedEvent) return;
    setSyncing(true);
    try {
      const result = await bulkSync(selectedEvent.id);
      Alert.alert(
        "Synchronisation terminée",
        `${result.synced} rencontres synchronisées.\n${result.failed > 0 ? `${result.failed} échoué(s).` : ""}`
      );
    } catch (err: any) {
      Alert.alert("Erreur", err.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Summary cards */}
      <View style={styles.summaryRow}>
        <Card accentColor={COLORS.warning} style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{pendingEncounters.length}</Text>
          <Text style={styles.summaryLabel}>En attente</Text>
        </Card>
        <Card accentColor={COLORS.success} style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{syncedEncounters.length}</Text>
          <Text style={styles.summaryLabel}>Synchronisés</Text>
        </Card>
      </View>

      {/* Sync button */}
      {pendingEncounters.length > 0 && (
        <Button
          title={`Synchroniser ${pendingEncounters.length} rencontre${pendingEncounters.length > 1 ? "s" : ""} → CRM`}
          onPress={handleBulkSync}
          loading={syncing}
          style={{ marginBottom: SPACING.xl }}
        />
      )}

      <SectionHeader title="En attente de synchronisation" />

      {/* Pending list */}
      <FlatList
        data={pendingEncounters}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.encounterItem}>
            <View style={styles.encounterInfo}>
              <Text style={styles.encounterTitle}>{item.title}</Text>
              <Text style={styles.encounterMeta}>
                {item.participants.length} participant{item.participants.length > 1 ? "s" : ""} ·{" "}
                {new Date(item.timestamp).toLocaleDateString("fr-FR")}
              </Text>
            </View>
            <View style={[styles.statusDot, { backgroundColor: COLORS.warning }]} />
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {isLoading ? "Chargement..." : "Tout est synchronisé !"}
          </Text>
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.lg },
  summaryRow: { flexDirection: "row", gap: SPACING.md, marginBottom: SPACING.lg },
  summaryCard: { flex: 1 },
  summaryNumber: { fontSize: FONT_SIZES.xxxl, fontWeight: "800", color: COLORS.text },
  summaryLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textMuted },
  encounterItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  encounterInfo: { flex: 1 },
  encounterTitle: { fontSize: FONT_SIZES.md, fontWeight: "600", color: COLORS.text },
  encounterMeta: { fontSize: FONT_SIZES.sm, color: COLORS.textMuted, marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  emptyText: {
    textAlign: "center",
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.md,
    paddingTop: SPACING.xxl,
  },
});
