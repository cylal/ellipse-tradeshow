import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert,
  KeyboardAvoidingView, Platform, TextInput, Keyboard, Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEventStore } from "../../src/stores/eventStore";
import { Card, ChipGroup, Button, Input } from "../../src/components";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from "../../src/constants/theme";
import { CONFIG } from "../../src/constants/config";
import type { TradeShowEvent, EncounterParticipant, EncounterType, CaptureMode } from "../../src/types";
import { api } from "../../src/services/api";

const toTitleCase = (s?: string) =>
  s ? s.toLowerCase().replace(/(?:^|\s|-)\S/g, (c) => c.toUpperCase()) : s;

export default function QuickCaptureScreen() {
  const router = useRouter();
  const { events: rawEvents, activeEvent, fetchEvents, createEncounter, syncEncounter, setActiveEvent } = useEventStore();
  const events = rawEvents || [];

  const [selectedEvent, setSelectedEvent] = useState<TradeShowEvent | null>(activeEvent);
  const [title, setTitle] = useState("");
  const [encounterType, setEncounterType] = useState<EncounterType>("meeting");
  const [manualNotes, setManualNotes] = useState("");
  const [participants, setParticipants] = useState<EncounterParticipant[]>([]);
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [isSaving, setIsSaving] = useState(false);
  const [audioData, setAudioData] = useState<any>(null);
  const [localTasks, setLocalTasks] = useState<Array<{ id: string; description: string; priority: string; assignee?: string }>>([]);
  const [showTaskInput, setShowTaskInput] = useState(false);
  const [taskDesc, setTaskDesc] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [taskAssignee, setTaskAssignee] = useState("");
  const pendingOcrResult = useEventStore((s) => s.pendingOcrResult);
  const setPendingOcrResult = useEventStore((s) => s.setPendingOcrResult);
  const pendingAudioResult = useEventStore((s) => s.pendingAudioResult);
  const setPendingAudioResult = useEventStore((s) => s.setPendingAudioResult);
  const pendingPortraitUrl = useEventStore((s) => s.pendingPortraitUrl);
  const setPendingPortraitUrl = useEventStore((s) => s.setPendingPortraitUrl);
  const [portraitPickerUrl, setPortraitPickerUrl] = useState<string | null>(null);

  useEffect(() => {
    // Fetch both active and upcoming events so the user can switch between them
    fetchEvents();
  }, []);

  useEffect(() => {
    if (pendingOcrResult?.parsed) {
      const p = pendingOcrResult.parsed;
      const name = toTitleCase(p.name) || "Scanned Contact";
      const company = toTitleCase(p.company);
      const jobTitle = toTitleCase(p.title);
      const newParticipant: EncounterParticipant = {
        id: `ocr_${Date.now()}`,
        contactName: name,
        company,
        title: jobTitle,
        email: p.email?.toLowerCase(),
        phone: p.phone,
        website: p.website?.toLowerCase(),
        photos: [],
        isNew: true,
      };
      setParticipants((prev) => [...prev, newParticipant]);
      if (!title && name !== "Scanned Contact") {
        setTitle(`Meeting with ${name}${company ? ` (${company})` : ""}`);
      }
      setPendingOcrResult(null);
    }
  }, [pendingOcrResult]);

  useEffect(() => {
    if (pendingAudioResult) {
      setAudioData(pendingAudioResult);
      if (pendingAudioResult.memo && !manualNotes) {
        setManualNotes(pendingAudioResult.memo);
      }
      if (!title && pendingAudioResult.mode === "dictation") {
        setTitle(`Dictated memo — ${new Date().toLocaleDateString("en-US")}`);
      }
      setPendingAudioResult(null);
    }
  }, [pendingAudioResult]);

  // When a portrait photo arrives from the camera
  useEffect(() => {
    if (!pendingPortraitUrl) return;
    const timer = setTimeout(() => {
      if (participants.length === 1) {
        // Single contact: auto-assign
        setParticipants((prev) => [{ ...prev[0], portraitUrl: pendingPortraitUrl }]);
      } else {
        // 0 or multiple contacts: show inline picker (waiting for assignment)
        setPortraitPickerUrl(pendingPortraitUrl);
      }
      setPendingPortraitUrl(null);
    }, 500);
    return () => clearTimeout(timer);
  }, [pendingPortraitUrl]);

  // When a new participant is added while a portrait is waiting
  useEffect(() => {
    if (!portraitPickerUrl || participants.length === 0) return;
    if (participants.length === 1) {
      // First contact just arrived, auto-assign the waiting portrait
      setParticipants((prev) => [{ ...prev[0], portraitUrl: portraitPickerUrl }]);
      setPortraitPickerUrl(null);
    }
    // If >1 participants, keep showing the picker
  }, [participants.length]);

  const assignPortraitToParticipant = (index: number) => {
    if (!portraitPickerUrl) return;
    setParticipants((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], portraitUrl: portraitPickerUrl };
      return updated;
    });
    setPortraitPickerUrl(null);
  };

  useEffect(() => {
    if (!selectedEvent && events.length > 0) {
      const active = events.find((e) => e.status === "active") || events.find((e) => e.status === "upcoming");
      if (active) setSelectedEvent(active);
    }
  }, [events]);

  const handleSave = async () => {
    if (!selectedEvent) {
      Alert.alert("Error", "Please select an event.");
      return;
    }
    if (!title.trim()) {
      Alert.alert("Error", "Please give the encounter a title.");
      return;
    }

    setIsSaving(true);
    try {
      const captureMode: CaptureMode = audioData ? (participants.length > 0 ? "both" : "audio") : "manual";
      const result = await createEncounter(selectedEvent.id, {
        title: title.trim(),
        encounterType,
        timestamp: new Date().toISOString(),
        participants,
        captureMode,
        manualNotes: manualNotes.trim() || undefined,
        priority,
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
      // Create tasks if any were added
      if (localTasks.length > 0 && result?.id) {
        for (const t of localTasks) {
          try {
            await api.createTask({ encounterId: result.id, description: t.description, priority: t.priority as any, assignee: t.assignee });
          } catch { /* fail silently */ }
        }
      }
      const taskCount = localTasks.length;
      const resetForm = () => {
        setTitle("");
        setManualNotes("");
        setParticipants([]);
        setAudioData(null);
        setLocalTasks([]);
      };

      const handleSyncNow = async () => {
        if (!result?.id) return;
        try {
          await syncEncounter(result.id);
          Alert.alert("Synced!", "Encounter synced to CRM.", [{ text: "OK", onPress: resetForm }]);
        } catch (syncErr: any) {
          Alert.alert(
            "Sync failed",
            syncErr.message || "Could not sync to CRM. You can retry later from the encounter list.",
            [{ text: "OK", onPress: resetForm }]
          );
        }
      };

      Alert.alert(
        "Encounter saved" + (taskCount > 0 ? ` with ${taskCount} task${taskCount > 1 ? "s" : ""}` : ""),
        "Sync this encounter to the CRM now?",
        [
          { text: "Later", style: "cancel", onPress: resetForm },
          { text: "Sync to CRM", onPress: handleSyncNow },
        ]
      );
    } catch (err: any) {
      Alert.alert("Error", err.message || "Unable to save.");
    } finally {
      setIsSaving(false);
    }
  };

  const encounterTypeOptions = CONFIG.ENCOUNTER_TYPES.map((t) => ({ value: t.value, label: t.label }));
  const priorityOptions = CONFIG.PRIORITY_OPTIONS.map((p) => ({ value: p.value, label: p.label, color: p.color }));
  const scrollViewRef = useRef<ScrollView>(null);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
    <ScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
      {selectedEvent ? (
        <TouchableOpacity style={styles.eventBanner} onPress={() => setSelectedEvent(null)}>
          <Text style={styles.eventBannerLabel}>Active Event</Text>
          <Text style={styles.eventBannerName}>{selectedEvent.name}</Text>
          <Text style={styles.eventBannerChange}>Change ▸</Text>
        </TouchableOpacity>
      ) : (
        <Card style={styles.eventPicker}>
          <Text style={styles.label}>Select an event</Text>
          {events.filter((e) => e.status === "active" || e.status === "upcoming").length === 0 ? (
            <View style={styles.emptyEvents}>
              <Ionicons name="calendar-outline" size={24} color={COLORS.textMuted} />
              <Text style={styles.emptyEventsText}>No active or upcoming events</Text>
            </View>
          ) : (
            events
              .filter((e) => e.status === "active" || e.status === "upcoming")
              .map((event) => (
                <TouchableOpacity key={event.id} style={styles.eventOption} onPress={() => setSelectedEvent(event)}>
                  <Text style={styles.eventOptionText}>{event.name}</Text>
                  <Text style={styles.eventOptionDate}>{event.location} · {event.status === "active" ? "Ongoing" : "Upcoming"}</Text>
                </TouchableOpacity>
              ))
          )}
        </Card>
      )}

      <Input label="Encounter Title" placeholder="Ex: Meeting with Samsung — Badge OCR demo" value={title} onChangeText={setTitle} />

      <Text style={styles.label}>Type</Text>
      <ChipGroup options={encounterTypeOptions} selected={encounterType} onSelect={(v) => setEncounterType(v as EncounterType)} />

      <Text style={styles.label}>Priority</Text>
      <ChipGroup options={priorityOptions} selected={priority} onSelect={(v) => setPriority(v as any)} />

      <Text style={styles.label}>Quick Actions</Text>
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push("/capture/camera")}>
          <View style={[styles.actionIconCircle, { backgroundColor: COLORS.accentSoft }]}>
            <Ionicons name="camera-outline" size={22} color={COLORS.accent} />
          </View>
          <Text style={styles.actionLabel}>Badge / Card</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push("/capture/audio")}>
          <View style={[styles.actionIconCircle, { backgroundColor: "#fef3c7" }]}>
            <Ionicons name="mic-outline" size={22} color={COLORS.warning} />
          </View>
          <Text style={styles.actionLabel}>Audio AI</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push("/capture/camera?type=portrait")}>
          <View style={[styles.actionIconCircle, { backgroundColor: COLORS.successLight }]}>
            <Ionicons name="person-outline" size={22} color={COLORS.success} />
          </View>
          <Text style={styles.actionLabel}>Portrait</Text>
        </TouchableOpacity>
      </View>

      {participants.length > 0 && (
        <>
          <Text style={styles.label}>Scanned Contacts ({participants.length})</Text>
          {participants.map((p, idx) => (
            <View key={p.id} style={styles.participantCard}>
              {!!p.portraitUrl ? (
                <Image source={{ uri: p.portraitUrl }} style={styles.participantPhoto} />
              ) : (
                <View style={[styles.participantPhoto, styles.participantPhotoPlaceholder]}>
                  <Text style={styles.participantPhotoInitials}>
                    {p.contactName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.participantName}>{p.contactName}</Text>
                {!!p.company && <Text style={styles.participantDetail}>{p.company}{p.title ? ` — ${p.title}` : ""}</Text>}
                {!!p.email && <Text style={styles.participantDetail}>{p.email}</Text>}
                {p.phone && <Text style={styles.participantDetail}>{p.phone}</Text>}
              </View>
              <TouchableOpacity onPress={() => setParticipants((prev) => prev.filter((_, i) => i !== idx))} style={styles.removeParticipant}>
                <Ionicons name="close-circle" size={22} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      {audioData && (
        <View style={styles.audioIndicator}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name={audioData.mode === "live" ? "mic" : "chatbox-ellipses"} size={16} color={COLORS.accent} />
              <Text style={styles.audioIndicatorTitle}>{audioData.mode === "live" ? "Audio recorded" : "Dictation recorded"}</Text>
            </View>
            <Text style={styles.audioIndicatorDetail}>AI memo generated · {audioData.actionItems?.length || 0} next steps</Text>
            {audioData.sentiment && <Text style={styles.audioIndicatorSentiment}>Sentiment: {audioData.sentiment}</Text>}
          </View>
          <TouchableOpacity onPress={() => setAudioData(null)} style={styles.removeParticipant}>
            <Text style={{ color: COLORS.error, fontSize: FONT_SIZES.lg }}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      <Input
        label="Notes / Memo"
        placeholder={audioData ? "AI memo generated — edit if needed" : "Notes on the encounter, topics discussed..."}
        value={manualNotes}
        onChangeText={setManualNotes}
        multiline
      />

      {/* Tasks */}
      <Text style={styles.label}>Tasks</Text>
      {localTasks.map((t, idx) => (
        <View key={t.id} style={styles.localTaskRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.localTaskDesc}>{t.description}</Text>
            <Text style={styles.localTaskMeta}>
              {CONFIG.PRIORITY_OPTIONS.find((p) => p.value === t.priority)?.label || t.priority}
              {t.assignee ? ` · ${t.assignee}` : ""}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setLocalTasks((prev) => prev.filter((_, i) => i !== idx))} style={{ padding: 4 }}>
            <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      ))}
      {showTaskInput ? (
        <View style={styles.taskInputCard}>
          <TextInput
            style={styles.taskInput}
            placeholder="Task description..."
            placeholderTextColor={COLORS.textMuted}
            value={taskDesc}
            onChangeText={setTaskDesc}
            autoFocus
          />
          <View style={{ marginBottom: SPACING.sm }}>
            <ChipGroup
              options={CONFIG.PRIORITY_OPTIONS.map((p) => ({ value: p.value, label: p.label, color: p.color }))}
              selected={taskPriority}
              onSelect={setTaskPriority}
            />
          </View>
          <TextInput
            style={styles.taskInput}
            placeholder="Assignee (optional)"
            placeholderTextColor={COLORS.textMuted}
            value={taskAssignee}
            onChangeText={setTaskAssignee}
          />
          <View style={styles.taskInputActions}>
            <TouchableOpacity onPress={() => { setShowTaskInput(false); setTaskDesc(""); setTaskAssignee(""); }} style={{ padding: SPACING.sm }}>
              <Text style={{ color: COLORS.textMuted, fontWeight: "600" }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                if (!taskDesc.trim()) return;
                setLocalTasks((prev) => [...prev, { id: `t_${Date.now()}`, description: taskDesc.trim(), priority: taskPriority, assignee: taskAssignee.trim() || undefined }]);
                setTaskDesc("");
                setTaskAssignee("");
                setTaskPriority("medium");
                setShowTaskInput(false);
              }}
              style={[styles.taskAddBtn, !taskDesc.trim() && { opacity: 0.4 }]}
            >
              <Ionicons name="checkmark" size={14} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: FONT_SIZES.sm }}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.taskAddTrigger} onPress={() => setShowTaskInput(true)}>
          <Ionicons name="add-circle-outline" size={18} color={COLORS.accent} />
          <Text style={styles.taskAddTriggerText}>Add Task</Text>
        </TouchableOpacity>
      )}

      <Button
        title="Save Encounter"
        onPress={handleSave}
        loading={isSaving}
        icon={<Ionicons name="checkmark-circle-outline" size={18} color={COLORS.textInverse} />}
        style={{ marginTop: SPACING.xl }}
      />

      {/* Inline portrait assignment picker */}
      {!!portraitPickerUrl && (
        <View style={styles.pickerCard}>
          <View style={styles.pickerHeader}>
            <Image source={{ uri: portraitPickerUrl }} style={styles.portraitPreview} />
            <View style={{ flex: 1 }}>
              <Text style={styles.pickerTitle}>
                {participants.length === 0 ? "Portrait Ready" : "Assign Portrait"}
              </Text>
              <Text style={styles.pickerSubtitle}>
                {participants.length === 0
                  ? "Scan a badge or card to assign this photo"
                  : "Which contact is this portrait for?"}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setPortraitPickerUrl(null)} style={{ padding: SPACING.sm }}>
              <Ionicons name="close-circle" size={24} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
          {participants.length === 0 && (
            <View style={styles.pickerWaiting}>
              <Ionicons name="scan-outline" size={20} color={COLORS.accent} />
              <Text style={styles.pickerWaitingText}>Waiting for contacts...</Text>
            </View>
          )}
          {participants.map((p, idx) => (
            <TouchableOpacity
              key={p.id}
              style={styles.pickerOption}
              onPress={() => assignPortraitToParticipant(idx)}
            >
              {!!p.portraitUrl ? (
                <Image source={{ uri: p.portraitUrl }} style={styles.pickerOptionPhoto} />
              ) : (
                <View style={[styles.pickerOptionPhoto, styles.pickerOptionPhotoPlaceholder]}>
                  <Text style={styles.pickerOptionInitials}>
                    {p.contactName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.pickerOptionName}>{p.contactName}</Text>
                {!!p.company && <Text style={styles.pickerOptionDetail}>{p.company}</Text>}
              </View>
              <Ionicons name="arrow-forward-circle" size={24} color={COLORS.accent} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={{ height: 120 }} />
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: 60 },
  label: { fontSize: FONT_SIZES.sm, fontWeight: "600", color: COLORS.textSecondary, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  eventBanner: { backgroundColor: COLORS.accentSoft, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, borderWidth: 1.5, borderColor: COLORS.borderAccent },
  eventBannerLabel: { fontSize: FONT_SIZES.xs, color: COLORS.accent, fontWeight: "800", textTransform: "uppercase", letterSpacing: 1 },
  eventBannerName: { fontSize: FONT_SIZES.lg, fontWeight: "800", color: COLORS.text, marginTop: 4, letterSpacing: -0.3 },
  eventBannerChange: { fontSize: FONT_SIZES.sm, color: COLORS.accent, marginTop: SPACING.sm, fontWeight: "600" },
  eventPicker: { padding: SPACING.lg },
  emptyEvents: { alignItems: "center", paddingVertical: SPACING.xl, gap: SPACING.sm },
  emptyEventsText: { fontSize: FONT_SIZES.sm, color: COLORS.textMuted, fontWeight: "600" },
  eventOption: { paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  eventOptionText: { fontSize: FONT_SIZES.md, fontWeight: "600", color: COLORS.text },
  eventOptionDate: { fontSize: FONT_SIZES.sm, color: COLORS.textMuted, marginTop: 2 },
  participantCard: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, borderLeftWidth: 3, borderLeftColor: COLORS.accent, ...SHADOWS.sm },
  participantPhoto: { width: 42, height: 42, borderRadius: 21, marginRight: SPACING.md },
  participantPhotoPlaceholder: { backgroundColor: COLORS.accentSoft, alignItems: "center", justifyContent: "center" },
  participantPhotoInitials: { fontSize: FONT_SIZES.sm, fontWeight: "700", color: COLORS.accent },
  participantName: { fontSize: FONT_SIZES.md, fontWeight: "700", color: COLORS.text },
  participantDetail: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },
  removeParticipant: { padding: SPACING.sm },
  audioIndicator: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.accent + "10", borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginTop: SPACING.lg, borderLeftWidth: 3, borderLeftColor: COLORS.accent },
  audioIndicatorTitle: { fontSize: FONT_SIZES.md, fontWeight: "700", color: COLORS.text },
  audioIndicatorDetail: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },
  audioIndicatorSentiment: { fontSize: FONT_SIZES.xs, color: COLORS.accent, fontWeight: "600", marginTop: 2 },
  actionRow: { flexDirection: "row", gap: SPACING.md },
  actionButton: { flex: 1, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, alignItems: "center", borderWidth: 1, borderColor: COLORS.borderLight, ...SHADOWS.sm },
  actionIconCircle: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: SPACING.sm },
  actionLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontWeight: "700" },
  // Inline portrait picker
  pickerCard: { backgroundColor: COLORS.accent + "10", borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, marginTop: SPACING.lg, borderWidth: 1.5, borderColor: COLORS.accent + "40" },
  pickerHeader: { flexDirection: "row", alignItems: "center", marginBottom: SPACING.sm },
  pickerWaiting: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: SPACING.md, opacity: 0.7 },
  pickerWaitingText: { fontSize: FONT_SIZES.sm, color: COLORS.accent, fontWeight: "600" },
  pickerTitle: { fontSize: FONT_SIZES.md, fontWeight: "800", color: COLORS.text },
  pickerSubtitle: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },
  portraitPreview: { width: 52, height: 52, borderRadius: 26, marginRight: SPACING.md, borderWidth: 2, borderColor: COLORS.accent },
  pickerOption: { flexDirection: "row", alignItems: "center", paddingVertical: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.accent + "20" },
  pickerOptionPhoto: { width: 36, height: 36, borderRadius: 18, marginRight: SPACING.md },
  pickerOptionPhotoPlaceholder: { backgroundColor: COLORS.accentSoft, alignItems: "center", justifyContent: "center" },
  pickerOptionInitials: { fontSize: FONT_SIZES.xs, fontWeight: "700", color: COLORS.accent },
  pickerOptionName: { fontSize: FONT_SIZES.md, fontWeight: "600", color: COLORS.text },
  pickerOptionDetail: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: 1 },
  // Tasks
  localTaskRow: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, borderLeftWidth: 3, borderLeftColor: COLORS.accent, ...SHADOWS.sm },
  localTaskDesc: { fontSize: FONT_SIZES.md, fontWeight: "600", color: COLORS.text },
  localTaskMeta: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, marginTop: 2 },
  taskInputCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.borderLight },
  taskInput: { fontSize: FONT_SIZES.md, color: COLORS.text, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight, paddingVertical: SPACING.sm, marginBottom: SPACING.sm },
  taskInputActions: { flexDirection: "row", justifyContent: "flex-end", gap: SPACING.sm, marginTop: SPACING.xs },
  taskAddBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: COLORS.accent, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.md },
  taskAddTrigger: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: SPACING.md, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.borderLight, borderStyle: "dashed" },
  taskAddTriggerText: { fontSize: FONT_SIZES.sm, color: COLORS.accent, fontWeight: "600" },
});
