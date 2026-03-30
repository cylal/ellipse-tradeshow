import React, { useEffect, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet,
  RefreshControl, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useEventStore } from "../../src/stores/eventStore";
import { Card, StatusBadge, FAB, EmptyState, SectionHeader } from "../../src/components";
import { COLORS, SPACING, FONT_SIZES } from "../../src/constants/theme";
import type { TradeShowEvent } from "../../src/types";

function EventCard({ event, onPress }: { event: TradeShowEvent; onPress: () => void }) {
  const dateRange = `${formatDate(event.startDate)} — ${formatDate(event.endDate)}`;

  return (
    <Card onPress={onPress} shadow="md" style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle} numberOfLines={1}>{event.name}</Text>
        <StatusBadge status={event.status} />
      </View>

      {event.location && (
        <Text style={styles.cardLocation}>📍 {event.location}</Text>
      )}

      <Text style={styles.cardDate}>{dateRange}</Text>

      <View style={styles.cardStats}>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{event.encounterCount}</Text>
          <Text style={styles.statLabel}>Rencontres</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{event.contactsCollected}</Text>
          <Text style={styles.statLabel}>Contacts</Text>
        </View>
        {event.boothNumber && (
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{event.boothNumber}</Text>
            <Text style={styles.statLabel}>Stand</Text>
          </View>
        )}
      </View>
    </Card>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function EventListScreen() {
  const router = useRouter();
  const { events, isLoading, fetchEvents } = useEventStore();

  useEffect(() => {
    fetchEvents();
  }, []);

  const onRefresh = useCallback(() => {
    fetchEvents();
  }, [fetchEvents]);

  const activeEvents = events.filter((e) => e.status === "active");
  const upcomingEvents = events.filter((e) => e.status === "upcoming");
  const pastEvents = events.filter((e) => e.status === "completed");

  const sections = [
    ...(activeEvents.length > 0 ? [{ title: "En cours", data: activeEvents }] : []),
    ...(upcomingEvents.length > 0 ? [{ title: "À venir", data: upcomingEvents }] : []),
    ...(pastEvents.length > 0 ? [{ title: "Terminés", data: pastEvents }] : []),
  ];

  const allItems = sections.flatMap((s) => [
    { type: "header" as const, title: s.title, id: `h-${s.title}` },
    ...s.data.map((e) => ({ type: "event" as const, event: e, id: e.id })),
  ]);

  return (
    <View style={styles.container}>
      <FlatList
        data={allItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          if (item.type === "header") {
            return <SectionHeader title={item.title} />;
          }
          return (
            <EventCard
              event={item.event!}
              onPress={() => router.push(`/event/${item.event!.id}`)}
            />
          );
        }}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color={COLORS.accent} style={{ marginTop: 60 }} />
          ) : (
            <EmptyState
              title="Aucun salon pour le moment"
              subtitle="Créez votre premier salon pour commencer à capturer vos rencontres."
            />
          )
        }
      />

      <FAB onPress={() => router.push("/event/new")} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: SPACING.lg, paddingBottom: 100 },
  card: { marginBottom: SPACING.md },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
    color: COLORS.text,
    flex: 1,
    marginRight: SPACING.sm,
  },
  cardLocation: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  cardDate: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginBottom: SPACING.md,
  },
  cardStats: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: SPACING.md,
    gap: SPACING.xl,
  },
  stat: { alignItems: "center" },
  statNumber: { fontSize: FONT_SIZES.xl, fontWeight: "700", color: COLORS.accent },
  statLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted },
});
