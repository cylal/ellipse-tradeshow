import React, { useEffect, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, Alert,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useEventStore } from "../../src/stores/eventStore";
import { Card, ChipGroup, Button } from "../../src/components";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from "../../src/constants/theme";
import type { Encounter } from "../../src/types";

const SENTIMENT_EMOJI: Record<string, string> = {
  positive: "🟢",
  neutral: "🔵",
  cautious: "🟡",
  negative: "🔴",
};

function EncounterCard({ encounter, onPress }: { encounter: Encounter; onPress: () => void }) {
  const time = new Date(encounter.timestamp).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const participants = encounter.participants.map((p) => p.contactName).join(", ");

  return (
    <Card onPress={onPress} style={styles.encounterCard}>
      <View style={styles.encounterHeader}>
        <View style={styles.encounterTitleRow}>
          <Text style={styles.encounterTitle} numberOfLines={1}>{encounter.title}</Text>
          {encounter.aiSentiment && (
            <Text>{SENTIMENT_EMOJI[encounter.aiSentiment] || ""}</Text>
          )}
        </View>
        <View style={styles.encounterMeta}>
          <Text style={styles.encounterTime}>{time}</Text>
          {encounter.priority === "high" && (
            <View style={[styles.priorityDot, { backgroundColor: COLORS.error }]} />
          )}
          {!encounter.syncedToCrm && (
            <Text style={styles.pendingBadge}>⏳</Text>
          )}
        </View>
      </View>

      {participants && (
        <Text style={styles.participants} numberOfLines={1}>
          👥 {participants}
        </Text>
      )}

      {encounter.aiSummary && (
        <Text style={styles.summary} numberOfLines={2}>{encounter.aiSummary}</Text>
      )}

      {encounter.aiKeyTopics && encounter.aiKeyTopics.length > 0 && (
        <View style={styles.topicsRow}>
          {encounter.aiKeyTopics.slice(0, 3).map((topic, i) => (
            <View key={i} style={styles.topicChip}>
              <Text style={styles.topicText}>{topic}</Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

const FILTER_OPTIONS = [
  { value: "all", label: "Toutes" },
  { value: "pending", label: "⏳ À sync" },
  { value: "high", label: "🔴 Haute" },
];

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    activeEvent, encounters, isLoading,
    fetchEvent, fetchEncounters, setActiveEvent,
  } = useEventStore();

  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (id) {
      fetchEvent(id);
      fetchEncounters(id);
    }
  }, [id]);

  const filteredEncounters = filter === "all"
    ? encounters
    : filter === "pending"
    ? encounters.filter((e) => !e.syncedToCrm)
    : encounters.filter((e) => e.priority === filter);

  const handleSetActive = () => {
    if (activeEvent) {
      setActiveEvent(activeEvent);
      Alert.alert("Salon actif", `${activeEvent.name} est maintenant le salon actif pour la capture rapide.`);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{ title: activeEvent?.name || "Salon" }}
      />

      {/* Event header */}
      {activeEvent && (
        <View style={styles.header}>
          <Text style={styles.headerName}>{activeEvent.name}</Text>
          {activeEvent.location && (
            <Text style={styles.headerLocation}>📍 {activeEvent.location}</Text>
          )}
          <View style={styles.headerStats}>
            <View style={styles.headerStat}>
              <Text style={styles.headerStatNum}>{activeEvent.encounterCount}</Text>
              <Text style={styles.headerStatLabel}>Rencontres</Text>
            </View>
            <View style={styles.headerStat}>
              <Text style={styles.headerStatNum}>{activeEvent.contactsCollected}</Text>
              <Text style={styles.headerStatLabel}>Contacts</Text>
            </View>
          </View>
          <Button
            title="Définir comme salon actif"
            onPress={handleSetActive}
            style={{ marginTop: SPACING.md }}
          />
        </View>
      )}

      {/* Filters */}
      <View style={styles.filterRow}>
        <ChipGroup
          options={FILTER_OPTIONS}
          selected={filter}
          onSelect={setFilter}
        />
      </View>

      {/* Encounters list */}
      <FlatList
        data={filteredEncounters}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EncounterCard
            encounter={item}
            onPress={() => router.push(`/encounter/${item.id}`)}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => id && fetchEncounters(id)}
            tintColor={COLORS.accent}
          />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            Aucune rencontre enregistrée pour ce salon.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  headerName: { fontSize: FONT_SIZES.xl, fontWeight: "700", color: COLORS.textInverse },
  headerLocation: { fontSize: FONT_SIZES.sm, color: COLORS.textInverse + "bb", marginTop: 4 },
  headerStats: { flexDirection: "row", gap: SPACING.xxl, marginTop: SPACING.lg },
  headerStat: { alignItems: "center" },
  headerStatNum: { fontSize: FONT_SIZES.xxl, fontWeight: "800", color: COLORS.textInverse },
  headerStatLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textInverse + "99" },
  filterRow: {
    padding: SPACING.lg,
  },
  list: { paddingHorizontal: SPACING.lg, paddingBottom: 40 },
  encounterCard: { marginBottom: SPACING.md },
  encounterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  encounterTitleRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, flex: 1 },
  encounterTitle: { fontSize: FONT_SIZES.md, fontWeight: "700", color: COLORS.text, flex: 1 },
  encounterMeta: { flexDirection: "row", alignItems: "center", gap: SPACING.xs },
  encounterTime: { fontSize: FONT_SIZES.sm, color: COLORS.textMuted },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  pendingBadge: { fontSize: 14 },
  participants: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: SPACING.xs },
  summary: { fontSize: FONT_SIZES.sm, color: COLORS.textMuted, marginTop: SPACING.sm, lineHeight: 20 },
  topicsRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs, marginTop: SPACING.sm },
  topicChip: {
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  topicText: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary },
  emptyText: {
    textAlign: "center",
    color: COLORS.textMuted,
    fontSize: FONT_SIZES.md,
    paddingTop: SPACING.xxxl,
  },
});
