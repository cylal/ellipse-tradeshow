import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, StyleSheet, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useEventStore } from "../../src/stores/eventStore";
import { Card, Button, SectionHeader, EmptyState } from "../../src/components";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from "../../src/constants/theme";

export default function SyncScreen() {
  const { events: rawEvents, encounters: rawEncounters, activeEvent, fetchEvents, fetchEncounters, bulkSync, isLoading } = useEventStore();
  const events = rawEvents || [];
  const encounters = rawEncounters || [];
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
        "Sync Complete",
        `${result.synced} encounters synced.\n${result.failed > 0 ? `${result.failed} failed.` : ""}`
      );
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Summary cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: COLORS.warningLight }]}>
          <View style={styles.summaryIconRow}>
            <View style={[styles.summaryIconCircle, { backgroundColor: COLORS.warning + "30" }]}>
              <Ionicons name="time-outline" size={20} color={COLORS.warning} />
            </View>
          </View>
          <Text style={styles.summaryNumber}>{pendingEncounters.length}</Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: COLORS.successLight }]}>
          <View style={styles.summaryIconRow}>
            <View style={[styles.summaryIconCircle, { backgroundColor: COLORS.success + "30" }]}>
              <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.success} />
            </View>
          </View>
          <Text style={styles.summaryNumber}>{syncedEncounters.length}</Text>
          <Text style={styles.summaryLabel}>Synced</Text>
        </View>
      </View>

      {/* Sync button */}
      {pendingEncounters.length > 0 && (
        <Button
          title={`Sync ${pendingEncounters.length} encounter${pendingEncounters.length > 1 ? "s" : ""}`}
          onPress={handleBulkSync}
          loading={syncing}
          icon={<Ionicons name="cloud-upload-outline" size={18} color={COLORS.textInverse} />}
          style={{ marginBottom: SPACING.xl }}
        />
      )}

      <SectionHeader title="Pending Sync" count={pendingEncounters.length} />

      {/* Pending list */}
      <FlatList
        data={pendingEncounters}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={styles.encounterItem} shadow="sm">
            <View style={styles.encounterInfo}>
              <Text style={styles.encounterTitle}>{item.title}</Text>
              <View style={styles.encounterMetaRow}>
                <Ionicons name="people-outline" size={12} color={COLORS.textMuted} />
                <Text style={styles.encounterMeta}>
                  {item.participants.length} participant{item.participants.length > 1 ? "s" : ""}
                </Text>
                <View style={styles.metaDot} />
                <Ionicons name="calendar-outline" size={12} color={COLORS.textMuted} />
                <Text style={styles.encounterMeta}>
                  {new Date(item.timestamp).toLocaleDateString("fr-FR")}
                </Text>
              </View>
            </View>
            <View style={[styles.statusIndicator, { backgroundColor: COLORS.warning }]}>
              <Ionicons name="arrow-up-outline" size={12} color={COLORS.textInverse} />
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <EmptyState
            title={isLoading ? "Loading..." : "Everything is synced!"}
            subtitle={isLoading ? undefined : "All your encounters are up to date in the CRM."}
            icon="checkmark-done-circle-outline"
          />
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.lg },
  summaryRow: { flexDirection: "row", gap: SPACING.md, marginBottom: SPACING.xl },
  summaryCard: {
    flex: 1,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.sm,
  },
  summaryIconRow: {
    marginBottom: SPACING.sm,
  },
  summaryIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryNumber: {
    fontSize: FONT_SIZES.xxxl,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: -1,
  },
  summaryLabel: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, fontWeight: "600" },
  encounterItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  encounterInfo: { flex: 1 },
  encounterTitle: { fontSize: FONT_SIZES.md, fontWeight: "700", color: COLORS.text },
  encounterMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  encounterMeta: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, fontWeight: "500" },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.textMuted,
    marginHorizontal: 3,
  },
  statusIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
