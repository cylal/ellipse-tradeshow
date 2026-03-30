import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet,
  Alert, ActivityIndicator, Image,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useEventStore } from "../../src/stores/eventStore";
import { Card, Badge, Button, SectionHeader } from "../../src/components";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "../../src/constants/theme";
import type { Encounter, EncounterParticipant } from "../../src/types";
import { api } from "../../src/services/api";

function ParticipantCard({ participant }: { participant: EncounterParticipant }) {
  return (
    <View style={styles.participantCard}>
      {participant.portraitUrl ? (
        <Image source={{ uri: participant.portraitUrl }} style={styles.participantAvatar} />
      ) : (
        <View style={[styles.participantAvatar, styles.participantAvatarPlaceholder]}>
          <Text style={styles.avatarInitials}>
            {participant.contactName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </Text>
        </View>
      )}
      <View style={styles.participantInfo}>
        <Text style={styles.participantName}>{participant.contactName}</Text>
        {participant.company && (
          <Text style={styles.participantCompany}>{participant.company}</Text>
        )}
        {participant.title && (
          <Text style={styles.participantTitle}>{participant.title}</Text>
        )}
        {participant.email && (
          <Text style={styles.participantDetail}>📧 {participant.email}</Text>
        )}
        {participant.phone && (
          <Text style={styles.participantDetail}>📱 {participant.phone}</Text>
        )}
      </View>
      <View>
        {participant.isNew && (
          <Badge label="Nouveau" bg={COLORS.success + "15"} color={COLORS.success} />
        )}
        {participant.contactId && (
          <Text style={styles.linkedText}>CRM ✓</Text>
        )}
      </View>
    </View>
  );
}

const SENTIMENT_LABELS: Record<string, string> = {
  positive: "🟢 Positif",
  neutral: "🔵 Neutre",
  cautious: "🟡 Prudent",
  negative: "🔴 Négatif",
};

const PRIORITY_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  high: { bg: COLORS.error + "15", color: COLORS.error, label: "Haute" },
  medium: { bg: COLORS.warning + "15", color: COLORS.warning, label: "Moyenne" },
  low: { bg: COLORS.success + "15", color: COLORS.success, label: "Basse" },
};

export default function EncounterDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { syncEncounter } = useEventStore();
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (id) loadEncounter();
  }, [id]);

  const loadEncounter = async () => {
    try {
      const { encounter: enc } = await api.getEncounter(id!);
      setEncounter(enc);
    } catch (err: any) {
      Alert.alert("Erreur", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!encounter) return;
    setSyncing(true);
    try {
      await syncEncounter(encounter.id);
      await loadEncounter();
      Alert.alert("Succès", "Rencontre synchronisée avec le CRM.");
    } catch (err: any) {
      Alert.alert("Erreur", err.message);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (!encounter) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Rencontre introuvable</Text>
      </View>
    );
  }

  const priorityCfg = encounter.priority ? PRIORITY_CONFIG[encounter.priority] : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: encounter.title }} />

      {/* Header */}
      <Card shadow="md" style={{ marginBottom: SPACING.lg }}>
        <Text style={styles.title}>{encounter.title}</Text>
        <Text style={styles.eventName}>📅 {encounter.eventName}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            {new Date(encounter.timestamp).toLocaleDateString("fr-FR")} ·{" "}
            {new Date(encounter.timestamp).toLocaleTimeString("fr-FR", {
              hour: "2-digit", minute: "2-digit",
            })}
          </Text>
          {encounter.duration && (
            <Text style={styles.metaText}> · {encounter.duration} min</Text>
          )}
        </View>
        <View style={styles.tagsRow}>
          {encounter.aiSentiment && (
            <Text style={styles.tag}>{SENTIMENT_LABELS[encounter.aiSentiment]}</Text>
          )}
          {priorityCfg && (
            <Badge label={priorityCfg.label} bg={priorityCfg.bg} color={priorityCfg.color} />
          )}
        </View>
      </Card>

      {/* AI Summary */}
      {encounter.aiSummary && (
        <Card style={{ marginBottom: SPACING.md }}>
          <SectionHeader title="Résumé AI" />
          <Text style={styles.bodyText}>{encounter.aiSummary}</Text>
        </Card>
      )}

      {/* Key Topics */}
      {encounter.aiKeyTopics && encounter.aiKeyTopics.length > 0 && (
        <Card style={{ marginBottom: SPACING.md }}>
          <SectionHeader title="Sujets clés" />
          <View style={styles.topicsRow}>
            {encounter.aiKeyTopics.map((topic, i) => (
              <View key={i} style={styles.topicChip}>
                <Text style={styles.topicText}>{topic}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {/* Action Items */}
      {encounter.aiActionItems && encounter.aiActionItems.length > 0 && (
        <Card style={{ marginBottom: SPACING.md }}>
          <SectionHeader title="Actions à suivre" />
          {encounter.aiActionItems.map((item, i) => (
            <View key={i} style={styles.actionItem}>
              <Text style={styles.actionBullet}>→</Text>
              <Text style={styles.actionText}>{item}</Text>
            </View>
          ))}
        </Card>
      )}

      {/* Follow-up */}
      {encounter.aiFollowUpSuggestion && (
        <Card style={{ marginBottom: SPACING.md, borderLeftWidth: 3, borderLeftColor: COLORS.accent }}>
          <SectionHeader title="Suggestion de suivi" />
          <Text style={[styles.bodyText, { fontStyle: "italic" }]}>
            {encounter.aiFollowUpSuggestion}
          </Text>
        </Card>
      )}

      {/* Manual Notes */}
      {encounter.manualNotes && (
        <Card style={{ marginBottom: SPACING.md }}>
          <SectionHeader title="Notes" />
          <Text style={styles.bodyText}>{encounter.manualNotes}</Text>
        </Card>
      )}

      {/* Participants */}
      {encounter.participants.length > 0 && (
        <Card style={{ marginBottom: SPACING.md }}>
          <SectionHeader title={`Participants (${encounter.participants.length})`} />
          {encounter.participants.map((p) => (
            <ParticipantCard key={p.id} participant={p} />
          ))}
        </Card>
      )}

      {/* Sync */}
      {!encounter.syncedToCrm ? (
        <Button
          title="Synchroniser avec le CRM"
          onPress={handleSync}
          loading={syncing}
          style={{ marginTop: SPACING.lg }}
        />
      ) : (
        <View style={styles.syncedBanner}>
          <Text style={styles.syncedText}>✅ Synchronisé avec le CRM</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: 60 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { color: COLORS.textMuted, fontSize: FONT_SIZES.lg },
  title: { fontSize: FONT_SIZES.xl, fontWeight: "700", color: COLORS.text },
  eventName: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: SPACING.xs },
  metaRow: { flexDirection: "row", marginTop: SPACING.sm },
  metaText: { fontSize: FONT_SIZES.sm, color: COLORS.textMuted },
  tagsRow: { flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.md },
  tag: { fontSize: FONT_SIZES.sm },
  bodyText: { fontSize: FONT_SIZES.md, color: COLORS.text, lineHeight: 22 },
  topicsRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  topicChip: {
    backgroundColor: COLORS.accent + "10",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  topicText: { fontSize: FONT_SIZES.sm, color: COLORS.accent, fontWeight: "500" },
  actionItem: { flexDirection: "row", marginBottom: SPACING.sm, gap: SPACING.sm },
  actionBullet: { fontSize: FONT_SIZES.md, color: COLORS.accent, fontWeight: "700" },
  actionText: { fontSize: FONT_SIZES.md, color: COLORS.text, flex: 1, lineHeight: 22 },
  participantCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  participantAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: SPACING.md,
  },
  participantAvatarPlaceholder: {
    backgroundColor: COLORS.accent + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: { fontSize: FONT_SIZES.md, fontWeight: "700", color: COLORS.accent },
  participantInfo: { flex: 1 },
  participantName: { fontSize: FONT_SIZES.md, fontWeight: "600", color: COLORS.text },
  participantCompany: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  participantTitle: { fontSize: FONT_SIZES.sm, color: COLORS.textMuted },
  participantDetail: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, marginTop: 2 },
  linkedText: { fontSize: FONT_SIZES.xs, color: COLORS.success, marginTop: 4 },
  syncedBanner: {
    backgroundColor: COLORS.success + "10",
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    alignItems: "center",
    marginTop: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.success + "30",
  },
  syncedText: { color: COLORS.success, fontSize: FONT_SIZES.md, fontWeight: "600" },
});
