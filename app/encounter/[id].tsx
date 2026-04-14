import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, Image, TextInput,
} from "react-native";
import { useLocalSearchParams, Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEventStore } from "../../src/stores/eventStore";
import { Card, Badge, Button, SectionHeader, Input, ChipGroup } from "../../src/components";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from "../../src/constants/theme";
import { CONFIG } from "../../src/constants/config";
import type { Encounter, EncounterParticipant, EncounterTask, EncounterType, TaskStatus } from "../../src/types";
import { api } from "../../src/services/api";

// ─── Helpers ────────────────────────────────────────────────────

const SENTIMENT_LABELS: Record<string, string> = {
  positive: "Positive", neutral: "Neutral", cautious: "Cautious", negative: "Negative",
};
const SENTIMENT_ICONS: Record<string, string> = {
  positive: "happy-outline", neutral: "remove-circle-outline", cautious: "alert-circle-outline", negative: "sad-outline",
};
const PRIORITY_CFG: Record<string, { bg: string; color: string; label: string }> = {
  high: { bg: COLORS.error + "15", color: COLORS.error, label: "High" },
  medium: { bg: COLORS.warning + "15", color: COLORS.warning, label: "Medium" },
  low: { bg: COLORS.success + "15", color: COLORS.success, label: "Low" },
};
const TASK_STATUS_LABELS: Record<TaskStatus, string> = { todo: "To Do", in_progress: "In Progress", done: "Done" };
const TASK_STATUS_ICONS: Record<TaskStatus, string> = { todo: "ellipse-outline", in_progress: "time-outline", done: "checkmark-circle" };
const TASK_STATUS_COLORS: Record<TaskStatus, string> = { todo: COLORS.textMuted, in_progress: COLORS.warning, done: COLORS.success };

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Participant Card ────────────────────────────────────────────

function ParticipantCard({ participant }: { participant: EncounterParticipant }) {
  return (
    <View style={styles.participantCard}>
      {participant.portraitUrl ? (
        <Image source={{ uri: participant.portraitUrl }} style={styles.pAvatar} />
      ) : (
        <View style={[styles.pAvatar, styles.pAvatarPlaceholder]}>
          <Text style={styles.pInitials}>
            {participant.contactName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.pName}>{participant.contactName}</Text>
        {!!participant.company && <Text style={styles.pCompany}>{participant.company}{participant.title ? ` — ${participant.title}` : ""}</Text>}
        {!!participant.email && <Text style={styles.pDetail}>{participant.email}</Text>}
        {!!participant.phone && <Text style={styles.pDetail}>{participant.phone}</Text>}
      </View>
      {!!participant.contactId && <Text style={styles.crmLinked}>CRM</Text>}
    </View>
  );
}

// ─── Task Row ────────────────────────────────────────────────────

function TaskRow({ task, onToggle, onDelete }: { task: EncounterTask; onToggle: () => void; onDelete: () => void }) {
  const statusColor = TASK_STATUS_COLORS[task.status];
  const priorityCfg = PRIORITY_CFG[task.priority];
  return (
    <View style={styles.taskRow}>
      <TouchableOpacity onPress={onToggle} style={styles.taskCheck}>
        <Ionicons
          name={TASK_STATUS_ICONS[task.status] as any}
          size={22}
          color={statusColor}
        />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={[styles.taskDesc, task.status === "done" && styles.taskDone]}>{task.description}</Text>
        <View style={styles.taskMeta}>
          {!!task.dueDate && <Text style={styles.taskMetaText}>{formatDate(task.dueDate)}</Text>}
          {!!task.assignee && <Text style={styles.taskMetaText}>{task.assignee}</Text>}
          <Text style={[styles.taskMetaText, { color: priorityCfg.color }]}>{priorityCfg.label}</Text>
        </View>
      </View>
      <TouchableOpacity onPress={onDelete} style={{ padding: 4 }}>
        <Ionicons name="trash-outline" size={16} color={COLORS.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Add Task Form ──────────────────────────────────────────────

function AddTaskForm({ onAdd }: { onAdd: (task: { description: string; priority: string; dueDate?: string; assignee?: string }) => void }) {
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState("medium");
  const [assignee, setAssignee] = useState("");
  const [expanded, setExpanded] = useState(false);

  const handleAdd = () => {
    if (!desc.trim()) return;
    onAdd({ description: desc.trim(), priority, assignee: assignee.trim() || undefined });
    setDesc("");
    setAssignee("");
    setPriority("medium");
    setExpanded(false);
  };

  if (!expanded) {
    return (
      <TouchableOpacity style={styles.addTaskBtn} onPress={() => setExpanded(true)}>
        <Ionicons name="add-circle-outline" size={18} color={COLORS.accent} />
        <Text style={styles.addTaskBtnText}>Add Task</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.addTaskForm}>
      <TextInput
        style={styles.addTaskInput}
        placeholder="Task description..."
        placeholderTextColor={COLORS.textMuted}
        value={desc}
        onChangeText={setDesc}
        autoFocus
      />
      <View style={styles.addTaskRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.addTaskLabel}>Priority</Text>
          <ChipGroup
            options={CONFIG.PRIORITY_OPTIONS.map((p) => ({ value: p.value, label: p.label, color: p.color }))}
            selected={priority}
            onSelect={setPriority}
          />
        </View>
      </View>
      <TextInput
        style={styles.addTaskInput}
        placeholder="Assignee (optional)"
        placeholderTextColor={COLORS.textMuted}
        value={assignee}
        onChangeText={setAssignee}
      />
      <View style={styles.addTaskActions}>
        <TouchableOpacity onPress={() => setExpanded(false)} style={styles.addTaskCancel}>
          <Text style={styles.addTaskCancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleAdd} style={[styles.addTaskSave, !desc.trim() && { opacity: 0.4 }]}>
          <Ionicons name="checkmark" size={16} color="#fff" />
          <Text style={styles.addTaskSaveText}>Add</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Screen ────────────────────────────────────────────────

export default function EncounterDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { syncEncounter } = useEventStore();
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editType, setEditType] = useState<EncounterType>("meeting");
  const [editPriority, setEditPriority] = useState("medium");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Tasks
  const [tasks, setTasks] = useState<EncounterTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  useEffect(() => {
    if (id) {
      loadEncounter();
      loadTasks();
    }
  }, [id]);

  const loadEncounter = async () => {
    try {
      const { encounter: enc } = await api.getEncounter(id!);
      setEncounter(enc);
      setEditTitle(enc.title);
      setEditType(enc.encounterType);
      setEditPriority(enc.priority || "medium");
      setEditNotes(enc.manualNotes || "");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    setLoadingTasks(true);
    try {
      const result = await api.listTasks(id!);
      setTasks(result.tasks || []);
    } catch {
      // Tasks endpoint may not exist yet — fail silently
      setTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!encounter || !editTitle.trim()) return;
    setSaving(true);
    try {
      const { encounter: updated } = await api.updateEncounter(encounter.id, {
        title: editTitle.trim(),
        encounterType: editType,
        priority: editPriority as any,
        manualNotes: editNotes.trim() || undefined,
      });
      setEncounter(updated);
      setEditing(false);
      Alert.alert("Saved", "Encounter updated.");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    if (!encounter) return;
    setSyncing(true);
    try {
      await syncEncounter(encounter.id);
      await loadEncounter();
      Alert.alert("Success", "Encounter synced with CRM.");
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setSyncing(false);
    }
  };

  // ─── Task actions ─────────────────────────────────────────────

  const addTask = async (taskData: { description: string; priority: string; dueDate?: string; assignee?: string }) => {
    try {
      const { task } = await api.createTask({
        encounterId: id!,
        description: taskData.description,
        priority: taskData.priority as any,
        assignee: taskData.assignee,
      });
      setTasks((prev) => [...prev, task]);
    } catch {
      // If API fails, add locally
      const localTask: EncounterTask = {
        id: `local_${Date.now()}`,
        encounterId: id!,
        description: taskData.description,
        status: "todo",
        priority: (taskData.priority as any) || "medium",
        assignee: taskData.assignee,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setTasks((prev) => [...prev, localTask]);
    }
  };

  const toggleTaskStatus = async (task: EncounterTask) => {
    const nextStatus: Record<TaskStatus, TaskStatus> = { todo: "in_progress", in_progress: "done", done: "todo" };
    const newStatus = nextStatus[task.status];
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: newStatus } : t));
    try {
      await api.updateTask(task.id, { status: newStatus } as any);
    } catch {
      // revert on failure silently
    }
  };

  const deleteTask = async (task: EncounterTask) => {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    try {
      await api.deleteTask(task.id);
    } catch {
      // already removed from UI
    }
  };

  // ─── Render ───────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (!encounter) {
    return (
      <View style={styles.center}>
        <Text style={{ color: COLORS.textMuted, fontSize: FONT_SIZES.lg }}>Encounter not found</Text>
      </View>
    );
  }

  const priorityCfg = encounter.priority ? PRIORITY_CFG[encounter.priority] : null;
  const encounterTypeOptions = CONFIG.ENCOUNTER_TYPES.map((t) => ({ value: t.value, label: t.label }));
  const priorityOptions = CONFIG.PRIORITY_OPTIONS.map((p) => ({ value: p.value, label: p.label, color: p.color }));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen
        options={{
          title: editing ? "Edit Encounter" : encounter.title,
          headerRight: () =>
            !editing ? (
              <TouchableOpacity onPress={() => setEditing(true)} style={{ marginRight: 8 }}>
                <Ionicons name="create-outline" size={22} color={COLORS.accent} />
              </TouchableOpacity>
            ) : null,
        }}
      />

      {/* ─── EDIT MODE ─── */}
      {editing ? (
        <>
          <Input label="Title" value={editTitle} onChangeText={setEditTitle} />

          <Text style={styles.label}>Type</Text>
          <ChipGroup options={encounterTypeOptions} selected={editType} onSelect={(v) => setEditType(v as EncounterType)} />

          <Text style={styles.label}>Priority</Text>
          <ChipGroup options={priorityOptions} selected={editPriority} onSelect={setEditPriority} />

          <Input
            label="Notes"
            placeholder="Notes..."
            value={editNotes}
            onChangeText={setEditNotes}
            multiline
          />

          <View style={styles.editActions}>
            <TouchableOpacity
              style={styles.editCancel}
              onPress={() => {
                setEditing(false);
                setEditTitle(encounter.title);
                setEditType(encounter.encounterType);
                setEditPriority(encounter.priority || "medium");
                setEditNotes(encounter.manualNotes || "");
              }}
            >
              <Text style={styles.editCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Button title="Save" onPress={handleSaveEdit} loading={saving} style={{ flex: 1 }} />
          </View>
        </>
      ) : (
        <>
          {/* ─── VIEW MODE ─── */}

          {/* Header Card */}
          <Card shadow="md" style={{ marginBottom: SPACING.lg }}>
            <Text style={styles.title}>{encounter.title}</Text>
            <Text style={styles.eventName}>{encounter.eventName}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>
                {formatDate(encounter.timestamp)} · {new Date(encounter.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </Text>
              {!!encounter.duration && <Text style={styles.metaText}> · {encounter.duration} min</Text>}
            </View>
            <View style={styles.tagsRow}>
              {!!encounter.aiSentiment && (
                <View style={styles.sentimentChip}>
                  <Ionicons name={SENTIMENT_ICONS[encounter.aiSentiment] as any} size={14} color={COLORS.accent} />
                  <Text style={styles.sentimentText}>{SENTIMENT_LABELS[encounter.aiSentiment]}</Text>
                </View>
              )}
              {priorityCfg && <Badge label={priorityCfg.label} bg={priorityCfg.bg} color={priorityCfg.color} />}
            </View>
          </Card>

          {/* AI Summary */}
          {!!encounter.aiSummary && (
            <Card style={{ marginBottom: SPACING.md }}>
              <SectionHeader title="AI Summary" />
              <Text style={styles.bodyText}>{typeof encounter.aiSummary === "string" ? encounter.aiSummary : (encounter.aiSummary as any)?.summary || ""}</Text>
            </Card>
          )}

          {/* Key Topics */}
          {encounter.aiKeyTopics && encounter.aiKeyTopics.length > 0 && (
            <Card style={{ marginBottom: SPACING.md }}>
              <SectionHeader title="Key Topics" />
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
              <SectionHeader title="Action Items" />
              {encounter.aiActionItems.map((item, i) => (
                <View key={i} style={styles.actionItem}>
                  <Text style={styles.actionBullet}>→</Text>
                  <Text style={styles.actionText}>{item}</Text>
                </View>
              ))}
            </Card>
          )}

          {/* Follow-up */}
          {!!(typeof encounter.aiFollowUpSuggestion === "string" ? encounter.aiFollowUpSuggestion : (encounter.aiFollowUpSuggestion as any)?.followUpSuggestion) && (
            <Card style={{ marginBottom: SPACING.md, borderLeftWidth: 3, borderLeftColor: COLORS.accent }}>
              <SectionHeader title="Follow-up Suggestion" />
              <Text style={[styles.bodyText, { fontStyle: "italic" }]}>
                {typeof encounter.aiFollowUpSuggestion === "string" ? encounter.aiFollowUpSuggestion : (encounter.aiFollowUpSuggestion as any)?.followUpSuggestion || ""}
              </Text>
            </Card>
          )}

          {/* Notes */}
          {!!encounter.manualNotes && (
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

          {/* ─── TASKS ─── */}
          <Card style={{ marginBottom: SPACING.md }}>
            <SectionHeader title={`Tasks${tasks.length > 0 ? ` (${tasks.length})` : ""}`} />
            {loadingTasks ? (
              <ActivityIndicator size="small" color={COLORS.accent} style={{ marginVertical: SPACING.md }} />
            ) : tasks.length === 0 ? (
              <Text style={styles.emptyTasks}>No tasks yet</Text>
            ) : (
              tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={() => toggleTaskStatus(task)}
                  onDelete={() => deleteTask(task)}
                />
              ))
            )}
            <AddTaskForm onAdd={addTask} />
          </Card>

          {/* Sync */}
          {!encounter.syncedToCrm ? (
            <Button title="Sync with CRM" onPress={handleSync} loading={syncing} style={{ marginTop: SPACING.sm }} />
          ) : (
            <View style={styles.syncedBanner}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
              <Text style={styles.syncedText}>Synced with CRM</Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: 80 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: FONT_SIZES.xl, fontWeight: "800", color: COLORS.text, letterSpacing: -0.3 },
  eventName: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary, marginTop: SPACING.xs },
  metaRow: { flexDirection: "row", marginTop: SPACING.sm },
  metaText: { fontSize: FONT_SIZES.sm, color: COLORS.textMuted },
  tagsRow: { flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.md, alignItems: "center" },
  sentimentChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: COLORS.accent + "10", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  sentimentText: { fontSize: FONT_SIZES.xs, color: COLORS.accent, fontWeight: "600" },
  label: { fontSize: FONT_SIZES.sm, fontWeight: "600", color: COLORS.textSecondary, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  bodyText: { fontSize: FONT_SIZES.md, color: COLORS.text, lineHeight: 22 },
  topicsRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  topicChip: { backgroundColor: COLORS.accent + "10", paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.full },
  topicText: { fontSize: FONT_SIZES.sm, color: COLORS.accent, fontWeight: "500" },
  actionItem: { flexDirection: "row", marginBottom: SPACING.sm, gap: SPACING.sm },
  actionBullet: { fontSize: FONT_SIZES.md, color: COLORS.accent, fontWeight: "700" },
  actionText: { fontSize: FONT_SIZES.md, color: COLORS.text, flex: 1, lineHeight: 22 },
  // Participants
  participantCard: { flexDirection: "row", alignItems: "center", paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  pAvatar: { width: 44, height: 44, borderRadius: 22, marginRight: SPACING.md },
  pAvatarPlaceholder: { backgroundColor: COLORS.accent + "20", alignItems: "center", justifyContent: "center" },
  pInitials: { fontSize: FONT_SIZES.sm, fontWeight: "700", color: COLORS.accent },
  pName: { fontSize: FONT_SIZES.md, fontWeight: "600", color: COLORS.text },
  pCompany: { fontSize: FONT_SIZES.sm, color: COLORS.textSecondary },
  pDetail: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, marginTop: 1 },
  crmLinked: { fontSize: FONT_SIZES.xs, color: COLORS.success, fontWeight: "700", backgroundColor: COLORS.success + "15", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  // Tasks
  taskRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  taskCheck: { marginRight: SPACING.sm, paddingTop: 2 },
  taskDesc: { fontSize: FONT_SIZES.md, color: COLORS.text, fontWeight: "500" },
  taskDone: { textDecorationLine: "line-through", color: COLORS.textMuted },
  taskMeta: { flexDirection: "row", gap: SPACING.sm, marginTop: 2 },
  taskMetaText: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted },
  emptyTasks: { fontSize: FONT_SIZES.sm, color: COLORS.textMuted, textAlign: "center", paddingVertical: SPACING.md },
  addTaskBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: SPACING.md, marginTop: SPACING.sm },
  addTaskBtnText: { fontSize: FONT_SIZES.sm, color: COLORS.accent, fontWeight: "600" },
  addTaskForm: { marginTop: SPACING.sm, backgroundColor: COLORS.background, borderRadius: BORDER_RADIUS.md, padding: SPACING.md },
  addTaskInput: { fontSize: FONT_SIZES.md, color: COLORS.text, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight, paddingVertical: SPACING.sm, marginBottom: SPACING.sm },
  addTaskRow: { flexDirection: "row", gap: SPACING.md, marginBottom: SPACING.sm },
  addTaskLabel: { fontSize: FONT_SIZES.xs, color: COLORS.textSecondary, fontWeight: "600", marginBottom: 4 },
  addTaskActions: { flexDirection: "row", justifyContent: "flex-end", gap: SPACING.sm, marginTop: SPACING.sm },
  addTaskCancel: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
  addTaskCancelText: { color: COLORS.textMuted, fontWeight: "600" },
  addTaskSave: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: COLORS.accent, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.md },
  addTaskSaveText: { color: "#fff", fontWeight: "700" },
  // Edit mode
  editActions: { flexDirection: "row", gap: SPACING.md, marginTop: SPACING.xl },
  editCancel: { paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, justifyContent: "center" },
  editCancelText: { color: COLORS.textMuted, fontWeight: "600", fontSize: FONT_SIZES.md },
  // Sync
  syncedBanner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: COLORS.success + "10", borderRadius: BORDER_RADIUS.md, padding: SPACING.lg, marginTop: SPACING.sm, borderWidth: 1, borderColor: COLORS.success + "30" },
  syncedText: { color: COLORS.success, fontSize: FONT_SIZES.md, fontWeight: "600" },
});
