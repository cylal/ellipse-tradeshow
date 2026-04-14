import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  RefreshControl, ActivityIndicator, Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from "../../src/constants/theme";
import { api } from "../../src/services/api";
import type { Encounter } from "../../src/types";

const MEETING_THEME = {
  iconBg: "#d1fae5",
  iconColor: "#10b981",
  badgeBg: "#d1fae5",
  badgeColor: "#059669",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function SentimentBadge({ sentiment }: { sentiment?: string }) {
  if (!sentiment) return null;
  const map: Record<string, { bg: string; color: string; label: string }> = {
    positive: { bg: "#d1fae5", color: "#059669", label: "Positive" },
    neutral: { bg: "#f3f4f6", color: "#6b7280", label: "Neutral" },
    cautious: { bg: "#fef3c7", color: "#d97706", label: "Cautious" },
    negative: { bg: "#fee2e2", color: "#dc2626", label: "Negative" },
  };
  const s = map[sentiment] || map.neutral;
  return (
    <View style={[styles.sentimentBadge, { backgroundColor: s.bg }]}>
      <Text style={[styles.sentimentText, { color: s.color }]}>{s.label}</Text>
    </View>
  );
}

function MeetingCard({
  meeting,
  onPress,
}: {
  meeting: Encounter;
  onPress: () => void;
}) {
  const isRemote = meeting.meetingType === "remote";
  const participantCount = meeting.participants?.length || 0;

  return (
    <TouchableOpacity style={styles.meetingCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.meetingCardLeft}>
        <View style={[styles.meetingIcon, { backgroundColor: isRemote ? "#eef2ff" : MEETING_THEME.iconBg }]}>
          <Ionicons
            name={isRemote ? "videocam" : "people"}
            size={20}
            color={isRemote ? "#6366f1" : MEETING_THEME.iconColor}
          />
        </View>
      </View>
      <View style={styles.meetingCardContent}>
        <Text style={styles.meetingTitle} numberOfLines={1}>{meeting.title}</Text>
        <View style={styles.meetingMeta}>
          <Ionicons name="calendar-outline" size={12} color={COLORS.textMuted} />
          <Text style={styles.meetingMetaText}>
            {formatDate(meeting.timestamp)} · {formatTime(meeting.timestamp)}
          </Text>
        </View>
        {participantCount > 0 && (
          <View style={styles.meetingMeta}>
            <Ionicons name="person-outline" size={12} color={COLORS.textMuted} />
            <Text style={styles.meetingMetaText}>
              {participantCount} participant{participantCount > 1 ? "s" : ""}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.meetingCardRight}>
        <SentimentBadge sentiment={meeting.aiSentiment} />
        {meeting.syncedToCrm ? (
          <Ionicons name="cloud-done" size={16} color={COLORS.success} />
        ) : (
          <Ionicons name="cloud-upload-outline" size={16} color={COLORS.textMuted} />
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function MeetingsScreen() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Encounter[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMeetings = useCallback(async () => {
    try {
      const { encounters } = await api.listMeetings();
      setMeetings(encounters || []);
    } catch {
      // Silently handle — might be offline
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMeetings();
    setRefreshing(false);
  }, [fetchMeetings]);

  const synced = meetings.filter((m) => m.syncedToCrm).length;
  const pending = meetings.length - synced;

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
        }
      >
        {/* Stats row */}
        {meetings.length > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{meetings.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={[styles.statDivider]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: COLORS.success }]}>{synced}</Text>
              <Text style={styles.statLabel}>Synced</Text>
            </View>
            <View style={[styles.statDivider]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: COLORS.warning }]}>{pending}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>
        )}

        {/* Meeting list */}
        {meetings.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="people-outline" size={48} color={COLORS.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No Meetings</Text>
            <Text style={styles.emptySub}>
              Create your first meeting to start tracking.
            </Text>
          </View>
        ) : (
          <View style={styles.meetingsList}>
            {meetings.map((meeting) => (
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                onPress={() => router.push(`/encounter/${meeting.id}`)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/meetings/new")}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centerContainer: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background },
  scrollContent: { padding: SPACING.lg, paddingBottom: 100 },

  // Stats
  statsRow: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    alignItems: "center",
    justifyContent: "space-around",
    ...SHADOWS.sm,
  },
  statItem: { alignItems: "center" },
  statNumber: { fontSize: FONT_SIZES.xl, fontWeight: "800", color: COLORS.text },
  statLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, fontWeight: "600", marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: COLORS.border },

  // Meeting list
  meetingsList: { gap: SPACING.sm },
  meetingCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    gap: SPACING.md,
    ...SHADOWS.sm,
  },
  meetingCardLeft: {},
  meetingIcon: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  meetingCardContent: { flex: 1 },
  meetingTitle: { fontSize: FONT_SIZES.md, fontWeight: "700", color: COLORS.text, marginBottom: 4 },
  meetingMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  meetingMetaText: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted },
  meetingCardRight: { alignItems: "flex-end", gap: SPACING.sm },

  // Sentiment badge
  sentimentBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  sentimentText: { fontSize: 10, fontWeight: "700" },

  // Empty state
  emptyState: { alignItems: "center", paddingVertical: SPACING.xxl * 2 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: "center", justifyContent: "center",
    marginBottom: SPACING.lg,
  },
  emptyTitle: { fontSize: FONT_SIZES.lg, fontWeight: "700", color: COLORS.text, marginBottom: SPACING.sm },
  emptySub: { fontSize: FONT_SIZES.md, color: COLORS.textMuted, textAlign: "center", maxWidth: 260 },

  // FAB
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: MEETING_THEME.iconColor,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.lg,
  },
});
