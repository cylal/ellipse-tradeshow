import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert,
  KeyboardAvoidingView, Platform, TextInput, Image, Modal,
  ActivityIndicator, FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEventStore } from "../../src/stores/eventStore";
import { Button, Card, Input } from "../../src/components";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from "../../src/constants/theme";
import { api } from "../../src/services/api";
import type { EncounterParticipant, MeetingType } from "../../src/types";

// Calendar events loaded via api.getCalendarEvents()

export default function NewMeetingScreen() {
  const router = useRouter();

  // Form state
  const [meetingType, setMeetingType] = useState<MeetingType>("in_person");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [participants, setParticipants] = useState<EncounterParticipant[]>([]);
  const [audioData, setAudioData] = useState<any>(null);

  // Manual participant add
  const [showAddManual, setShowAddManual] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualCompany, setManualCompany] = useState("");
  const [manualEmail, setManualEmail] = useState("");

  // Calendar search
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarQuery, setCalendarQuery] = useState("");

  // Submit
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // OCR / Audio integration
  const pendingOcrResult = useEventStore((s) => s.pendingOcrResult);
  const setPendingOcrResult = useEventStore((s) => s.setPendingOcrResult);
  const pendingAudioResult = useEventStore((s) => s.pendingAudioResult);
  const setPendingAudioResult = useEventStore((s) => s.setPendingAudioResult);
  const pendingPortraitUrl = useEventStore((s) => s.pendingPortraitUrl);
  const setPendingPortraitUrl = useEventStore((s) => s.setPendingPortraitUrl);

  // Pick up OCR results from camera
  useEffect(() => {
    if (pendingOcrResult?.parsed) {
      const p = pendingOcrResult.parsed;
      const newParticipant: EncounterParticipant = {
        id: `ocr_${Date.now()}`,
        contactName: p.name || "Scanned Contact",
        company: p.company,
        title: p.title,
        email: p.email,
        phone: p.phone,
        website: p.website,
        photos: [],
        isNew: true,
      };
      setParticipants((prev) => [...prev, newParticipant]);

      // Auto-fill title if empty
      if (!title && p.name) {
        setTitle(`RDV avec ${p.name}${p.company ? ` (${p.company})` : ""}`);
      }
      setPendingOcrResult(null);
    }
  }, [pendingOcrResult]);

  // Pick up audio results
  useEffect(() => {
    if (pendingAudioResult) {
      setAudioData(pendingAudioResult);
      if (pendingAudioResult.memo && !manualNotes) {
        setManualNotes(pendingAudioResult.memo);
      }
      setPendingAudioResult(null);
    }
  }, [pendingAudioResult]);

  // Portrait for last participant
  useEffect(() => {
    if (pendingPortraitUrl && participants.length > 0) {
      setParticipants((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          portraitUrl: pendingPortraitUrl,
        };
        return updated;
      });
      setPendingPortraitUrl(null);
    }
  }, [pendingPortraitUrl]);

  // Add participant manually by name
  const handleAddManual = () => {
    const name = manualName.trim();
    if (!name) {
      Alert.alert("Error", "Name is required");
      return;
    }
    const newParticipant: EncounterParticipant = {
      id: `manual_${Date.now()}`,
      contactName: name,
      company: manualCompany.trim() || undefined,
      email: manualEmail.trim() || undefined,
      photos: [],
      isNew: true,
    };
    setParticipants((prev) => [...prev, newParticipant]);
    // Auto-fill title if empty
    if (!title) {
      setTitle(`RDV avec ${name}${manualCompany.trim() ? ` (${manualCompany.trim()})` : ""}`);
    }
    setManualName("");
    setManualCompany("");
    setManualEmail("");
    setShowAddManual(false);
  };

  // Search calendar events via backend (Graph API)
  const handleCalendarSearch = async (_query?: string) => {
    setCalendarLoading(true);
    try {
      // Fetch next 30 days of events
      const now = new Date();
      const inMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const result = await api.getCalendarEvents({
        startDate: now.toISOString(),
        endDate: inMonth.toISOString(),
      });
      let events = result.events || [];
      // Filter by query if provided
      const q = _query?.trim().toLowerCase();
      if (q && q !== "*") {
        events = events.filter((ev) =>
          ev.subject?.toLowerCase().includes(q) ||
          ev.attendees?.some((a) => a.name?.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q))
        );
      }
      // Only show events that have attendees
      events = events.filter((ev) => ev.attendees && ev.attendees.length > 0);
      setCalendarEvents(events);
    } catch (err: any) {
      console.warn("Calendar search error:", err.message);
      Alert.alert(
        "Calendar",
        "Unable to load calendar events. Check your connection or add participants manually."
      );
      setShowCalendarModal(false);
    } finally {
      setCalendarLoading(false);
    }
  };

  // Add attendees from a calendar event + auto-fill title & video link
  const handlePickCalendarEvent = (event: any) => {
    const attendees = event.attendees || [];
    let added = 0;
    for (const att of attendees) {
      const email = att.email || "";
      const name = att.name || email;
      // Skip self
      if (!name || email.toLowerCase().includes("clalo@ellipse")) continue;
      // Skip if already added
      if (participants.some((p) => p.email === email && email)) continue;
      const newP: EncounterParticipant = {
        id: `cal_${Date.now()}_${added}`,
        contactName: name,
        email: email || undefined,
        company: undefined,
        photos: [],
        isNew: true,
      };
      setParticipants((prev) => [...prev, newP]);
      added++;
    }
    if (added === 0) {
      Alert.alert("Info", "No new participants found in this event.");
    }
    // Always fill title from calendar event
    if (event.subject) {
      setTitle(event.subject);
    }
    // Auto-fill video link from calendar event
    const videoUrl = event.onlineMeetingUrl || event.onlineMeeting?.joinUrl;
    if (videoUrl) {
      setMeetingLink(videoUrl);
      setMeetingType("remote");
    }
    setShowCalendarModal(false);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Title is required");
      return;
    }

    setSaving(true);
    try {
      await api.createMeeting({
        title: title.trim(),
        encounterType: "meeting",
        meetingType,
        meetingLink: meetingType === "remote" ? meetingLink.trim() || undefined : undefined,
        location: meetingType === "in_person" ? location.trim() || undefined : undefined,
        timestamp: new Date().toISOString(),
        participants,
        captureMode: audioData ? "both" : "manual",
        manualNotes: manualNotes.trim() || undefined,
        ...(audioData ? {
          audioUrl: audioData.audioUrl,
          audioTranscript: audioData.transcript,
          aiSummary: audioData.summary,
          aiKeyTopics: audioData.keyTopics,
          aiActionItems: audioData.actionItems,
          aiSentiment: audioData.sentiment,
          aiFollowUpSuggestion: audioData.followUpSuggestion,
          duration: audioData.duration,
        } : {}),
      });
      setSuccess(true);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Unable to create meeting");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setTitle(""); setLocation(""); setMeetingLink(""); setManualNotes("");
    setParticipants([]); setAudioData(null); setSuccess(false);
  };

  // ── Success screen ──
  if (success) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={56} color={COLORS.success} />
          </View>
          <Text style={styles.successTitle}>Meeting Created!</Text>
          <Text style={styles.successSub}>
            {title} has been saved
          </Text>
          <View style={styles.successActions}>
            <Button title="New Meeting" onPress={handleReset} variant="primary" />
            <Button title="View List" onPress={() => router.back()} variant="outline" />
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Meeting type selector */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="options" size={18} color="#10b981" />
            <Text style={styles.sectionTitle}>Meeting Type</Text>
          </View>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[
                styles.typeCard,
                meetingType === "in_person" && styles.typeCardActive,
              ]}
              onPress={() => setMeetingType("in_person")}
              activeOpacity={0.7}
            >
              <Ionicons
                name="people"
                size={28}
                color={meetingType === "in_person" ? "#10b981" : COLORS.textMuted}
              />
              <Text style={[
                styles.typeLabel,
                meetingType === "in_person" && styles.typeLabelActive,
              ]}>
                In-Person
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeCard,
                meetingType === "remote" && styles.typeCardActive,
              ]}
              onPress={() => setMeetingType("remote")}
              activeOpacity={0.7}
            >
              <Ionicons
                name="videocam"
                size={28}
                color={meetingType === "remote" ? "#6366f1" : COLORS.textMuted}
              />
              <Text style={[
                styles.typeLabel,
                meetingType === "remote" && styles.typeLabelActive,
              ]}>
                Video Call
              </Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Main form */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="create" size={18} color="#10b981" />
            <Text style={styles.sectionTitle}>Details</Text>
          </View>
          <Input
            label="Title *"
            value={title}
            onChangeText={setTitle}
            placeholder="Ex: Revue trimestrielle avec Acme Corp"
          />
          {meetingType === "in_person" ? (
            <Input
              label="Location"
              value={location}
              onChangeText={setLocation}
              placeholder="Address or meeting location"
            />
          ) : (
            <Input
              label="Video Link"
              value={meetingLink}
              onChangeText={setMeetingLink}
              placeholder="https://teams.microsoft.com/..."
            />
          )}
        </Card>

        {/* Quick actions — scan / audio / portrait */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flash" size={18} color="#10b981" />
            <Text style={styles.sectionTitle}>Capture</Text>
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push("/capture/camera?type=business_card&returnTo=meetings/new")}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: COLORS.accentSoft }]}>
                <Ionicons name="camera-outline" size={22} color={COLORS.accent} />
              </View>
              <Text style={styles.actionLabel}>Business Card</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push("/capture/audio")}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: "#fef3c7" }]}>
                <Ionicons name="mic-outline" size={22} color={COLORS.warning} />
              </View>
              <Text style={styles.actionLabel}>Audio AI</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push("/capture/camera?type=portrait")}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: COLORS.successLight }]}>
                <Ionicons name="person-outline" size={22} color={COLORS.success} />
              </View>
              <Text style={styles.actionLabel}>Portrait</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Add participants section */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-add" size={18} color="#10b981" />
            <Text style={styles.sectionTitle}>Participants</Text>
          </View>

          {/* Add by name - inline form */}
          {showAddManual ? (
            <View style={styles.manualForm}>
              <TextInput
                style={styles.manualInput}
                value={manualName}
                onChangeText={setManualName}
                placeholder="Nom du participant *"
                placeholderTextColor={COLORS.textMuted}
                autoFocus
              />
              <TextInput
                style={styles.manualInput}
                value={manualCompany}
                onChangeText={setManualCompany}
                placeholder="Entreprise (optionnel)"
                placeholderTextColor={COLORS.textMuted}
              />
              <TextInput
                style={styles.manualInput}
                value={manualEmail}
                onChangeText={setManualEmail}
                placeholder="Email (optionnel)"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <View style={styles.manualActions}>
                <TouchableOpacity
                  style={styles.manualCancel}
                  onPress={() => { setShowAddManual(false); setManualName(""); setManualCompany(""); setManualEmail(""); }}
                >
                  <Text style={styles.manualCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.manualConfirm, !manualName.trim() && { opacity: 0.5 }]}
                  onPress={handleAddManual}
                  disabled={!manualName.trim()}
                >
                  <Ionicons name="checkmark" size={18} color="#fff" />
                  <Text style={styles.manualConfirmText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.addParticipantRow}>
              <TouchableOpacity
                style={styles.addParticipantBtn}
                onPress={() => setShowAddManual(true)}
                activeOpacity={0.7}
              >
                <View style={[styles.addBtnIcon, { backgroundColor: "#d1fae5" }]}>
                  <Ionicons name="person-add-outline" size={20} color="#10b981" />
                </View>
                <Text style={styles.addBtnLabel}>Add by Name</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addParticipantBtn}
                onPress={() => { setShowCalendarModal(true); handleCalendarSearch(); }}
                activeOpacity={0.7}
              >
                <View style={[styles.addBtnIcon, { backgroundColor: "#eef2ff" }]}>
                  <Ionicons name="calendar-outline" size={20} color="#6366f1" />
                </View>
                <Text style={styles.addBtnLabel}>From Calendar</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>

        {/* Calendar search modal */}
        <Modal
          visible={showCalendarModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowCalendarModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Calendar Events</Text>
              <TouchableOpacity onPress={() => setShowCalendarModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalSearchRow}>
              <TextInput
                style={styles.modalSearchInput}
                value={calendarQuery}
                onChangeText={setCalendarQuery}
                placeholder="Search event..."
                placeholderTextColor={COLORS.textMuted}
                returnKeyType="search"
                onSubmitEditing={() => handleCalendarSearch(calendarQuery)}
              />
              <TouchableOpacity
                style={styles.modalSearchBtn}
                onPress={() => handleCalendarSearch(calendarQuery)}
              >
                <Ionicons name="search" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            {calendarLoading ? (
              <View style={styles.modalCenter}>
                <ActivityIndicator size="large" color={COLORS.accent} />
                <Text style={{ color: COLORS.textMuted, marginTop: 12 }}>Loading...</Text>
              </View>
            ) : calendarEvents.length === 0 ? (
              <View style={styles.modalCenter}>
                <Ionicons name="calendar-outline" size={48} color={COLORS.textMuted} />
                <Text style={{ color: COLORS.textMuted, marginTop: 12 }}>No events found</Text>
              </View>
            ) : (
              <FlatList
                data={calendarEvents}
                keyExtractor={(item, idx) => item.id || `${idx}`}
                contentContainerStyle={{ padding: SPACING.md }}
                renderItem={({ item }) => {
                  const attendeeCount = (item.attendees || []).length;
                  const dateStr = item.start?.dateTime
                    ? new Date(item.start.dateTime).toLocaleDateString("fr-FR", {
                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                      })
                    : "";
                  const hasVideoLink = !!(item.onlineMeetingUrl || item.onlineMeeting?.joinUrl);
                  return (
                    <TouchableOpacity
                      style={styles.calEventCard}
                      onPress={() => handlePickCalendarEvent(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.calEventIcon}>
                        <Ionicons name={hasVideoLink ? "videocam" : "calendar"} size={20} color="#6366f1" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.calEventTitle} numberOfLines={1}>{item.subject || "Untitled"}</Text>
                        {!!dateStr && <Text style={styles.calEventDate}>{dateStr}</Text>}
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 }}>
                          <Text style={styles.calEventAttendees}>
                            {attendeeCount} participant{attendeeCount !== 1 ? "s" : ""}
                          </Text>
                          {hasVideoLink && <Text style={styles.calEventVideo}>Video</Text>}
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </Modal>

        {/* Participant list */}
        {participants.length > 0 && (
          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people" size={18} color="#10b981" />
              <Text style={styles.sectionTitle}>{participants.length} participant{participants.length > 1 ? "s" : ""} added</Text>
            </View>
            {participants.map((p, idx) => (
              <View key={p.id} style={styles.participantCard}>
                {p.portraitUrl ? (
                  <Image source={{ uri: p.portraitUrl }} style={styles.participantPhoto} />
                ) : (
                  <View style={[styles.participantPhoto, styles.participantPhotoPlaceholder]}>
                    <Text style={styles.participantInitials}>
                      {p.contactName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.participantName}>{p.contactName}</Text>
                  {!!p.company && (
                    <Text style={styles.participantDetail}>
                      {p.company}{p.title ? ` — ${p.title}` : ""}
                    </Text>
                  )}
                  {!!p.email && <Text style={styles.participantDetail}>{p.email}</Text>}
                </View>
                <TouchableOpacity
                  onPress={() => setParticipants((prev) => prev.filter((_, i) => i !== idx))}
                  style={{ padding: SPACING.sm }}
                >
                  <Ionicons name="close-circle" size={22} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            ))}
          </Card>
        )}

        {/* Audio indicator */}
        {audioData && (
          <View style={styles.audioIndicator}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name={audioData.mode === "live" ? "mic" : "chatbox-ellipses"} size={16} color={COLORS.accent} />
                <Text style={styles.audioTitle}>
                  {audioData.mode === "live" ? "Audio recorded" : "Dictation recorded"}
                </Text>
              </View>
              <Text style={styles.audioDetail}>
                AI-generated memo · {audioData.actionItems?.length || 0} next steps
              </Text>
            </View>
            <TouchableOpacity onPress={() => setAudioData(null)} style={{ padding: SPACING.sm }}>
              <Ionicons name="close-circle" size={22} color={COLORS.error} />
            </TouchableOpacity>
          </View>
        )}

        {/* Notes */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="chatbubble" size={18} color="#10b981" />
            <Text style={styles.sectionTitle}>Notes</Text>
          </View>
          <TextInput
            style={styles.notesInput}
            value={manualNotes}
            onChangeText={setManualNotes}
            placeholder="Meeting notes, topics discussed, next steps..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </Card>

        {/* Submit */}
        <View style={styles.submitRow}>
          <Button
            title={saving ? "Creating..." : "Save Meeting"}
            onPress={handleSubmit}
            variant="primary"
            disabled={saving || !title.trim()}
            loading={saving}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SPACING.lg, paddingBottom: 40 },

  section: { marginBottom: SPACING.lg },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: "700",
    color: COLORS.text,
  },

  // Type selector
  typeRow: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  typeCard: {
    flex: 1,
    alignItems: "center",
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  typeCardActive: {
    borderColor: "#10b981",
    backgroundColor: "#d1fae510",
  },
  typeLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "700",
    color: COLORS.textMuted,
  },
  typeLabelActive: {
    color: COLORS.text,
  },

  // Actions
  actionRow: { flexDirection: "row", gap: SPACING.md },
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
  },
  actionLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontWeight: "700" },

  // Participants
  participantCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderLeftWidth: 3,
    borderLeftColor: "#10b981",
  },
  participantPhoto: { width: 40, height: 40, borderRadius: 20, marginRight: SPACING.md },
  participantPhotoPlaceholder: {
    backgroundColor: "#d1fae5",
    alignItems: "center",
    justifyContent: "center",
  },
  participantInitials: { fontSize: FONT_SIZES.sm, fontWeight: "700", color: "#059669" },
  participantName: { fontSize: FONT_SIZES.md, fontWeight: "700", color: COLORS.text },
  participantDetail: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 1 },

  // Audio
  audioIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.accent + "10",
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  audioTitle: { fontSize: FONT_SIZES.md, fontWeight: "700", color: COLORS.text },
  audioDetail: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },

  // Notes
  notesInput: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    minHeight: 100,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // Submit
  submitRow: { marginTop: SPACING.sm, marginBottom: SPACING.xxl },

  // Add participant buttons
  addParticipantRow: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  addParticipantBtn: {
    flex: 1,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  addBtnIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
  },
  addBtnLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontWeight: "700", textAlign: "center" },

  // Manual add form
  manualForm: {
    gap: SPACING.sm,
  },
  manualInput: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  manualActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  manualCancel: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.sm,
  },
  manualCancelText: { fontSize: FONT_SIZES.md, color: COLORS.textMuted, fontWeight: "600" },
  manualConfirm: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: "#10b981",
  },
  manualConfirmText: { fontSize: FONT_SIZES.md, color: "#fff", fontWeight: "700" },

  // Calendar modal
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  modalTitle: { fontSize: FONT_SIZES.lg, fontWeight: "700", color: COLORS.text },
  modalSearchRow: {
    flexDirection: "row",
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  modalSearchInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalSearchBtn: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  calEventCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
    ...SHADOWS.sm,
  },
  calEventIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#eef2ff",
    alignItems: "center",
    justifyContent: "center",
  },
  calEventTitle: { fontSize: FONT_SIZES.md, fontWeight: "700", color: COLORS.text },
  calEventDate: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, marginTop: 2 },
  calEventAttendees: { fontSize: FONT_SIZES.xs, color: "#6366f1", fontWeight: "600" },
  calEventVideo: { fontSize: FONT_SIZES.xs, color: "#10b981", fontWeight: "700", backgroundColor: "#d1fae5", paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, overflow: "hidden" },

  // Success
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xxl,
  },
  successIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.successLight,
    alignItems: "center", justifyContent: "center",
    marginBottom: SPACING.lg,
  },
  successTitle: { fontSize: FONT_SIZES.xxl, fontWeight: "700", color: COLORS.text, marginBottom: SPACING.sm },
  successSub: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, marginBottom: SPACING.xl, textAlign: "center" },
  successActions: { gap: SPACING.md, width: "100%" },
});
