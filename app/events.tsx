import React, { useEffect, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet,
  RefreshControl, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEventStore } from "../src/stores/eventStore";
import { Card, StatusBadge, FAB, EmptyState, SectionHeader } from "../src/components";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from "../src/constants/theme";
import type { TradeShowEvent } from "../src/types";
const APP_VERSION = "1.3.0";


function EventCard({ event, onPress }: { event: TradeShowEvent; onPress: () => void }) {
  const dateRange = `${formatDate(event.startDate)} — ${formatDate(event.endDate)}`;
  const isActive = event.status === "active";

  return (
    <Card onPress={onPress} shadow={isActive ? "lg" : "md"} style={[
      styles.card,
      isActive && styles.cardActive,
    ]}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1, marginRight: SPACING.sm }}>
          <Text style={styles.cardTitle} numberOfLines={1}>{event.name}</Text>
          {event.location && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={13} color={COLORS.textMuted} />
              <Text style={styles.cardLocation}>{event.location}</Text>
            </View>
          )}
        </View>
        <StatusBadge status={event.status} />
      </View>

      <View style={styles.dateRow}>
        <Ionicons name="calendar-outline" size={13} color={COLORS.textMuted} />
        <Text style={styles.cardDate}>{dateRange}</Text>
        {event.boothNumber && (
          <>
            <View style={styles.dateDot} />
            <Ionicons name="easel-outline" size={13} color={COLORS.textMuted} />
            <Text style={styles.cardDate}>Stand {event.boothNumber}</Text>
          </>
        )}
      </View>

      <View style={styles.cardStats}>
        <View style={styles.stat}>
          <View style={[styles.statIcon, { backgroundColor: COLORS.accentSoft }]}>
            <Ionicons name="people-outline" size={16} color={COLORS.accent} />
          </View>
          <View>
            <Text style={styles.statNumber}>{event.encounterCount}</Text>
            <Text style={styles.statLabel}>Encounters</Text>
          </View>
        </View>
        <View style={styles.stat}>
          <View style={[styles.statIcon, { backgroundColor: COLORS.successLight }]}>
            <Ionicons name="id-card-outline" size={16} color={COLORS.success} />
          </View>
          <View>
            <Text style={styles.statNumber}>{event.contactsCollected}</Text>
            <Text style={styles.statLabel}>Contacts</Text>
          </View>
        </View>
      </View>
    </Card>
  );
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    let d: Date;
    if (/^\d{8}$/.test(dateStr)) {
      d = new Date(
        parseInt(dateStr.slice(0, 4)),
        parseInt(dateStr.slice(4, 6)) - 1,
        parseInt(dateStr.slice(6, 8))
      );
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      // Parse YYYY-MM-DD as local date (not UTC)
      const [y, m, day] = dateStr.split("-");
      d = new Date(parseInt(y), parseInt(m) - 1, parseInt(day));
    } else {
      d = new Date(dateStr);
    }
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  } catch {
    return dateStr;
  }
}

export default function EventListScreen() {
  const router = useRouter();
  const { events: rawEvents, isLoading, fetchEvents } = useEventStore();
  const events = rawEvents || [];

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
    ...(activeEvents.length > 0 ? [{ title: "Ongoing", data: activeEvents }] : []),
    ...(upcomingEvents.length > 0 ? [{ title: "Upcoming", data: upcomingEvents }] : []),
    ...(pastEvents.length > 0 ? [{ title: "Completed", data: pastEvents }] : []),
  ];

  const allItems = sections.flatMap((s) => [
    { type: "header" as const, title: s.title, id: `h-${s.title}`, count: s.data.length },
    ...s.data.map((e) => ({ type: "event" as const, event: e, id: e.id })),
  ]);

  return (
    <View style={styles.container}>
      <FlatList
        data={allItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          if (item.type === "header") {
            return <SectionHeader title={item.title} count={(item as any).count} />;
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
              title="No events yet"
              subtitle="Create your first event to start capturing your encounters."
              icon="calendar-outline"
            />
          )
        }
      />

      <View style={styles.versionBar}>
        <Text style={styles.versionText}>FieldActivity v{APP_VERSION}</Text>
      </View>
      <FAB onPress={() => router.push("/event/new")} icon="add" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: SPACING.lg, paddingBottom: 100 },
  card: { marginBottom: SPACING.lg },
  cardActive: {
    borderColor: COLORS.borderAccent,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.xs,
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  cardLocation: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  dateDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.textMuted,
    marginHorizontal: 4,
  },
  cardDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    fontWeight: "500",
  },
  cardStats: {
    flexDirection: "row",
    gap: SPACING.xxl,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statNumber: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "800",
    color: COLORS.text,
    lineHeight: 20,
  },
  statLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, fontWeight: "500" },
  versionBar: { alignItems: "center", paddingVertical: 4 },
  versionText: { fontSize: 10, color: COLORS.textMuted, letterSpacing: 0.5, fontWeight: "500" },
});
