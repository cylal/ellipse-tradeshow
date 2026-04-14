import React, { useCallback, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useEventStore } from "../../src/stores/eventStore";
import { api } from "../../src/services/api";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from "../../src/constants/theme";
import type { Encounter } from "../../src/types";

const ITEM_THEMES = {
  conference: { color: "#6366f1", bg: "#eef2ff", icon: "business" as const },
  meeting: { color: "#10b981", bg: "#d1fae5", icon: "people" as const },
  contact: { color: "#f97316", bg: "#ffedd5", icon: "person-add" as const },
};

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return "now";
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "yesterday";
  if (diffD < 7) return `${diffD}d`;
  return `${Math.floor(diffD / 7)}w`;
}

interface ActivityItem {
  id: string;
  text: string;
  detail: string;
  time: string;
  link: string;
  type: "conference" | "meeting" | "contact";
  sortDate: number;
}

export default function ActivityScreen() {
  const router = useRouter();
  const { events: rawEvents, fetchEvents } = useEventStore();
  const events = rawEvents || [];
  const [refreshing, setRefreshing] = useState(false);
  const [recentMeetings, setRecentMeetings] = useState<Encounter[]>([]);
  const [recentContacts, setRecentContacts] = useState<any[]>([]);

  const loadActivity = useCallback(async () => {
    await fetchEvents();
    try {
      const meetingResult = await api.listMeetings();
      setRecentMeetings(meetingResult?.encounters || []);
    } catch {}
    try {
      const contactResult = await api.listContacts();
      setRecentContacts(contactResult?.contacts || []);
    } catch {}
  }, [fetchEvents]);

  useFocusEffect(
    useCallback(() => {
      loadActivity();
    }, [loadActivity])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadActivity();
    setRefreshing(false);
  }, [loadActivity]);

  const items: ActivityItem[] = [
    ...events.map(ev => ({
      id: `ev_${ev.id}`,
      text: ev.name,
      detail: `${ev.encounterCount} encounter${ev.encounterCount !== 1 ? "s" : ""} · ${ev.location || ""}`,
      time: formatRelativeTime(ev.updatedAt),
      link: `/event/${ev.id}`,
      type: "conference" as const,
      sortDate: new Date(ev.updatedAt).getTime(),
    })),
    ...recentMeetings.map(m => ({
      id: `mt_${m.id}`,
      text: m.title,
      detail: `Meeting · ${m.encounterType || ""}`,
      time: formatRelativeTime(m.createdAt),
      link: `/encounter/${m.id}`,
      type: "meeting" as const,
      sortDate: new Date(m.createdAt).getTime(),
    })),
    ...recentContacts.map((c: any) => ({
      id: `ct_${c.id || c.contactId}`,
      text: `${c.firstName} ${c.lastName}`,
      detail: c.accountName || c.company || "Contact",
      time: formatRelativeTime(c.createdAt),
      link: "",
      type: "contact" as const,
      sortDate: new Date(c.createdAt).getTime(),
    })),
  ].sort((a, b) => b.sortDate - a.sortDate);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
        }
      >
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No activity yet</Text>
            <Text style={styles.emptyDesc}>Your recent conferences, meetings, and contacts will appear here.</Text>
          </View>
        ) : (
          items.map((item) => {
            const theme = ITEM_THEMES[item.type];
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.activityItem}
                onPress={() => item.link ? router.push(item.link as any) : undefined}
                activeOpacity={0.7}
              >
                <View style={[styles.itemIcon, { backgroundColor: theme.bg }]}>
                  <Ionicons name={theme.icon} size={18} color={theme.color} />
                </View>
                <View style={styles.itemContent}>
                  <Text style={styles.itemText} numberOfLines={1}>{item.text}</Text>
                  <Text style={styles.itemDetail} numberOfLines={1}>{item.detail}</Text>
                </View>
                <Text style={styles.itemTime}>{item.time}</Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SPACING.lg, paddingBottom: 40 },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: SPACING.md,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
    color: COLORS.text,
  },
  emptyDesc: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    textAlign: "center",
    paddingHorizontal: SPACING.xl,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
    ...SHADOWS.sm,
  },
  itemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  itemContent: { flex: 1 },
  itemText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.text,
  },
  itemDetail: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  itemTime: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textMuted,
    fontWeight: "500",
  },
});
