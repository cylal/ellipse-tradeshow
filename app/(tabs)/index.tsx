import React, { useEffect, useCallback, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, RefreshControl, ActivityIndicator, AppState,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useEventStore } from "../../src/stores/eventStore";
import { useAuthStore } from "../../src/stores/authStore";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from "../../src/constants/theme";
import type { TradeShowEvent } from "../../src/types";
const APP_VERSION = "2.0.0";

// ─── Activity Card Colors ───────────────────────────────────────────────────

const CARD_THEMES = {
  conference: {
    iconBg: "#eef2ff",
    iconColor: "#6366f1",
    borderColor: "#c7d2fe",
    badgeBg: "#eef2ff",
    badgeColor: "#6366f1",
  },
  meeting: {
    iconBg: "#d1fae5",
    iconColor: "#10b981",
    borderColor: "#6ee7b7",
    badgeBg: "#d1fae5",
    badgeColor: "#059669",
  },
  contact: {
    iconBg: "#ffedd5",
    iconColor: "#f97316",
    borderColor: "#fdba74",
    badgeBg: "#ffedd5",
    badgeColor: "#ea580c",
  },
};

// ─── Activity Card ───────────────────────────────────────────────────────────

function ActivityCard({ icon, title, desc, badge, theme, onPress }: {
  icon: string; title: string; desc: string; badge?: string | null;
  theme: typeof CARD_THEMES.conference; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.activityCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.cardIcon, { backgroundColor: theme.iconBg }]}>
        <Ionicons name={icon as any} size={26} color={theme.iconColor} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDesc}>{desc}</Text>
      </View>
      {badge && (
        <View style={[styles.cardBadge, { backgroundColor: theme.badgeBg }]}>
          <Text style={[styles.cardBadgeText, { color: theme.badgeColor }]}>{badge}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ActivityHubScreen() {
  const router = useRouter();
  const { events: rawEvents, isLoading, fetchEvents } = useEventStore();
  const { user } = useAuthStore();
  const events = rawEvents || [];
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    await fetchEvents();
  }, [fetchEvents]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const activeEvents = events.filter((e) => e.status === "active");
  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />
        }
      >
        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={styles.greetingText}>
            Hello <Text style={styles.greetingName}>{firstName}</Text>
          </Text>
          <Text style={styles.greetingSub}>What would you like to do?</Text>
        </View>

        {/* Conference — Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={[styles.heroIconBg, { backgroundColor: CARD_THEMES.conference.iconBg }]}>
              <Ionicons name="business" size={28} color={CARD_THEMES.conference.iconColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Conference</Text>
              <Text style={styles.heroDesc}>Trade shows, events & exhibitions</Text>
            </View>
            {activeEvents.length > 0 && (
              <View style={[styles.cardBadge, { backgroundColor: CARD_THEMES.conference.badgeBg }]}>
                <Text style={[styles.cardBadgeText, { color: CARD_THEMES.conference.badgeColor }]}>
                  {activeEvents.length} active
                </Text>
              </View>
            )}
          </View>
          <View style={styles.heroButtons}>
            <TouchableOpacity
              style={styles.heroButton}
              onPress={() => router.push("/events")}
              activeOpacity={0.7}
            >
              <Ionicons name="list" size={20} color={CARD_THEMES.conference.iconColor} />
              <Text style={[styles.heroButtonText, { color: CARD_THEMES.conference.iconColor }]}>Conferences</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.heroButton, styles.heroButtonAccent]}
              onPress={() => router.push("/capture")}
              activeOpacity={0.7}
            >
              <Ionicons name="radio-button-on" size={20} color="#fff" />
              <Text style={[styles.heroButtonText, { color: "#fff" }]}>Capture</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Secondary Cards */}
        <View style={styles.cardsContainer}>
          <ActivityCard
            icon="people"
            title="Meetings"
            desc="Client meetings, remote or in-person"
            theme={CARD_THEMES.meeting}
            onPress={() => router.push("/meetings")}
          />
          <ActivityCard
            icon="person-add"
            title="Contact"
            desc="Scan a business card"
            theme={CARD_THEMES.contact}
            onPress={() => router.push("/quick-contact")}
          />
        </View>

        {/* Version */}
        <View style={styles.versionBar}>
          <Text style={styles.versionText}>Ellipse Field v{APP_VERSION}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 40,
  },

  // Greeting
  greeting: {
    marginBottom: SPACING.xl,
    marginTop: SPACING.sm,
  },
  greetingText: {
    fontSize: FONT_SIZES.xl,
    color: COLORS.textSecondary,
    fontWeight: "400",
  },
  greetingName: {
    color: COLORS.text,
    fontWeight: "700",
  },
  greetingSub: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  // Hero Conference card
  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg + 4,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  heroIconBg: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 2,
  },
  heroDesc: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  heroButtons: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  heroButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.md + 2,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: "#eef2ff",
  },
  heroButtonAccent: {
    backgroundColor: "#6366f1",
  },
  heroButtonText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "700",
  },

  // Activity cards
  cardsContainer: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.lg + 4,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.lg,
    ...SHADOWS.md,
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: BORDER_RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },
  cardBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  cardBadgeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: "700",
  },

  // Version
  versionBar: {
    alignItems: "center",
    paddingTop: SPACING.lg,
  },
  versionText: {
    fontSize: 10,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    fontWeight: "500",
  },
});
