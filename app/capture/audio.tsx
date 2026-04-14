import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, ScrollView,
} from "react-native";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../src/services/api";
import { useEventStore } from "../../src/stores/eventStore";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from "../../src/constants/theme";

type RecordingState = "idle" | "recording" | "paused" | "stopped";
type AudioMode = "live" | "dictation";

export default function AudioRecordScreen() {
  const router = useRouter();
  const recordingRef = useRef<Audio.Recording | null>(null);
  const { activeEvent, setPendingAudioResult } = useEventStore();

  const [mode, setMode] = useState<AudioMode | null>(null);
  const [state, setState] = useState<RecordingState>("idle");
  const [duration, setDuration] = useState(0);
  const [uri, setUri] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [transcriptResult, setTranscriptResult] = useState<string | null>(null);
  const [summaryResult, setSummaryResult] = useState<any>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Configure audio session on mount
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    }).catch(() => {});

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const startRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission required", "Microphone access is required to record.");
        return;
      }

      // Re-ensure audio mode is set (in case it failed on mount)
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
      } catch (audioModeErr) {
        console.warn("setAudioModeAsync warning:", audioModeErr);
        // Continue anyway — may still work
      }

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setState("recording");
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Unable to start recording.");
    }
  };

  const pauseRecording = async () => {
    if (!recordingRef.current) return;
    await recordingRef.current.pauseAsync();
    setState("paused");
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const resumeRecording = async () => {
    if (!recordingRef.current) return;
    await recordingRef.current.startAsync();
    setState("recording");
    timerRef.current = setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;
    if (timerRef.current) clearInterval(timerRef.current);

    await recordingRef.current.stopAndUnloadAsync();
    const recordingUri = recordingRef.current.getURI();
    recordingRef.current = null;

    setUri(recordingUri);
    setState("stopped");
  };

  const processAudio = async () => {
    if (!uri) return;
    setProcessing(true);

    try {
      // Step 1: Upload
      setProcessingStep("Upload de l'audio...");
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const filename = `encounter_audio_${Date.now()}.m4a`;
      const uploadResult = await api.uploadAudio(base64, filename, "audio/m4a");

      // Step 2: Transcribe
      setProcessingStep("Transcription en cours...");
      const transcription = await api.transcribeAudio(uploadResult.audioUrl);
      setTranscriptResult(transcription.transcript);

      // Step 3: Summarize with context
      if (transcription.transcript) {
        setProcessingStep("Generating AI memo...");

        // Get participants from the pending encounter (if any)
        const participants = useEventStore.getState().pendingOcrResult
          ? [{ name: useEventStore.getState().pendingOcrResult!.parsed.name || "Contact" }]
          : undefined;

        const summary = await api.summarizeEncounter(
          transcription.transcript,
          undefined,
          participants,
          activeEvent?.name,
          new Date().toLocaleDateString("fr-FR", {
            weekday: "long", year: "numeric", month: "long", day: "numeric",
            hour: "2-digit", minute: "2-digit",
          })
        );
        setSummaryResult(summary);

        // Save to store so quick-capture can pick it up
        setPendingAudioResult({
          audioUrl: uploadResult.audioUrl,
          transcript: transcription.transcript,
          summary: summary.summary,
          keyTopics: summary.keyTopics,
          actionItems: summary.actionItems,
          sentiment: summary.sentiment,
          followUpSuggestion: summary.followUpSuggestion,
          memo: summary.memo,
          duration: transcription.duration,
          mode: mode || "live",
        });
      }

      setProcessingStep("");
      Alert.alert(
        "Memo generated",
        "Transcription and AI memo are ready. Tap 'Use' to add it to the encounter."
      );
    } catch (err: any) {
      Alert.alert("Error", err.message || "Audio processing failed.");
    } finally {
      setProcessing(false);
      setProcessingStep("");
    }
  };

  const handleUseResult = () => {
    // pendingAudioResult is already set in processAudio
    router.back();
  };

  const resetRecording = () => {
    setState("idle");
    setMode(null);
    setDuration(0);
    setUri(null);
    setTranscriptResult(null);
    setSummaryResult(null);
  };

  // Mode selection screen
  if (!mode) {
    return (
      <View style={styles.container}>
        <View style={styles.modeSection}>
          <Text style={styles.modeTitle}>Recording type</Text>
          <Text style={styles.modeSubtitle}>
            Choose the mode best suited to your situation
          </Text>

          <TouchableOpacity
            style={styles.modeCard}
            onPress={() => setMode("live")}
          >
            <View style={[styles.modeIconCircle, { backgroundColor: COLORS.errorLight }]}>
              <Ionicons name="mic" size={28} color={COLORS.error} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.modeCardTitle}>Live Recording</Text>
              <Text style={styles.modeCardDesc}>
                Record the conversation during the meeting. AI will transcribe and generate a full memo.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modeCard}
            onPress={() => setMode("dictation")}
          >
            <View style={[styles.modeIconCircle, { backgroundColor: COLORS.accentSoft }]}>
              <Ionicons name="chatbox-ellipses" size={28} color={COLORS.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.modeCardTitle}>Quick Dictation</Text>
              <Text style={styles.modeCardDesc}>
                Dictate a summary after the meeting. AI will structure your notes into a memo with next steps.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Mode indicator */}
      <View style={styles.modeBadge}>
        <Ionicons name={mode === "live" ? "mic" : "chatbox-ellipses"} size={14} color={COLORS.accent} />
        <Text style={styles.modeBadgeText}>
          {mode === "live" ? "Live Recording" : "Quick Dictation"}
        </Text>
      </View>

      {/* Timer display */}
      <View style={styles.timerSection}>
        <Text style={styles.timer}>{formatTime(duration)}</Text>
        <Text style={styles.stateLabel}>
          {state === "idle" && (mode === "live"
            ? "Place phone near the conversation"
            : "Dictate your meeting summary")}
          {state === "recording" && "Recording..."}
          {state === "paused" && "Paused"}
          {state === "stopped" && "Recording finished"}
        </Text>

        {/* Waveform indicator */}
        {state === "recording" && (
          <View style={styles.waveRow}>
            {[...Array(12)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.waveBar,
                  { height: 10 + Math.random() * 30, opacity: 0.5 + Math.random() * 0.5 },
                ]}
              />
            ))}
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {state === "idle" && (
          <TouchableOpacity style={styles.recordButton} onPress={startRecording}>
            <View style={styles.recordDot} />
          </TouchableOpacity>
        )}

        {state === "recording" && (
          <View style={styles.controlRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={pauseRecording}>
              <Text style={styles.secondaryButtonText}>Pause</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
              <View style={styles.stopSquare} />
            </TouchableOpacity>
          </View>
        )}

        {state === "paused" && (
          <View style={styles.controlRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={resumeRecording}>
              <Text style={styles.secondaryButtonText}>Resume</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
              <View style={styles.stopSquare} />
            </TouchableOpacity>
          </View>
        )}

        {state === "stopped" && !processing && !summaryResult && (
          <View style={styles.controlRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={resetRecording}>
              <Text style={styles.secondaryButtonText}>Restart</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.processButton} onPress={processAudio}>
              <Text style={styles.processButtonText}>Generate memo</Text>
            </TouchableOpacity>
          </View>
        )}

        {processing && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.processingText}>{processingStep || "Processing..."}</Text>
          </View>
        )}
      </View>

      {/* Memo result */}
      {summaryResult?.memo && (
        <View style={styles.memoSection}>
          <Text style={styles.memoTitle}>Memo</Text>
          <Text style={styles.memoText}>{summaryResult.memo}</Text>
        </View>
      )}

      {/* Transcript */}
      {transcriptResult && (
        <View style={styles.resultSection}>
          <Text style={styles.resultTitle}>Transcript</Text>
          <Text style={styles.resultText} numberOfLines={8}>{transcriptResult}</Text>
        </View>
      )}

      {/* Summary details */}
      {summaryResult && (
        <>
          {summaryResult.actionItems?.length > 0 && (
            <View style={styles.resultSection}>
              <Text style={styles.resultTitle}>Next Steps</Text>
              {summaryResult.actionItems.map((item: string, idx: number) => (
                <Text key={idx} style={styles.actionItem}>• {item}</Text>
              ))}
            </View>
          )}

          {summaryResult.sentiment && (
            <View style={styles.sentimentBadge}>
              <Text style={styles.sentimentText}>
                Sentiment: {summaryResult.sentiment}
              </Text>
            </View>
          )}
        </>
      )}

      {/* Action buttons */}
      {summaryResult && (
        <View style={styles.bottomActions}>
          <TouchableOpacity style={styles.secondaryButton} onPress={resetRecording}>
            <Text style={styles.secondaryButtonText}>Redo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.doneButton} onPress={handleUseResult}>
            <Text style={styles.doneButtonText}>Use this memo</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SPACING.lg, paddingBottom: 60 },
  // Mode selection
  modeSection: { paddingTop: SPACING.xxxl },
  modeTitle: { fontSize: FONT_SIZES.xxl, fontWeight: "800", color: COLORS.text, textAlign: "center", letterSpacing: -0.5 },
  modeSubtitle: { fontSize: FONT_SIZES.md, color: COLORS.textMuted, textAlign: "center", marginTop: SPACING.sm, marginBottom: SPACING.xxl },
  modeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    gap: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.md,
  },
  modeIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  modeCardTitle: { fontSize: FONT_SIZES.lg, fontWeight: "800", color: COLORS.text, letterSpacing: -0.2 },
  modeCardDesc: { fontSize: FONT_SIZES.sm, color: COLORS.textMuted, marginTop: 4, lineHeight: 20 },
  cancelButton: { alignItems: "center", padding: SPACING.lg, marginTop: SPACING.lg },
  cancelButtonText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
  // Mode badge
  modeBadge: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.accentSoft,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderAccent,
  },
  modeBadgeText: { fontSize: FONT_SIZES.sm, color: COLORS.accent, fontWeight: "700" },
  // Timer
  timerSection: { alignItems: "center", paddingTop: SPACING.xl, paddingBottom: SPACING.lg },
  timer: { fontSize: 64, fontWeight: "200", color: COLORS.text, fontVariant: ["tabular-nums"] },
  stateLabel: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, marginTop: SPACING.sm, textAlign: "center", paddingHorizontal: SPACING.lg },
  waveRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: SPACING.xl, height: 40 },
  waveBar: { width: 4, backgroundColor: COLORS.accent, borderRadius: 2 },
  // Controls
  controls: { alignItems: "center", paddingVertical: SPACING.lg },
  controlRow: { flexDirection: "row", gap: SPACING.xl, alignItems: "center" },
  recordButton: {
    width: 80, height: 80, borderRadius: 40, borderWidth: 4,
    borderColor: COLORS.error, alignItems: "center", justifyContent: "center",
  },
  recordDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.error },
  stopButton: {
    width: 72, height: 72, borderRadius: 36, borderWidth: 4,
    borderColor: COLORS.error, alignItems: "center", justifyContent: "center",
  },
  stopSquare: { width: 28, height: 28, borderRadius: 4, backgroundColor: COLORS.error },
  secondaryButton: {
    paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.sm,
  },
  secondaryButtonText: { fontSize: FONT_SIZES.md, color: COLORS.text, fontWeight: "600" },
  processButton: {
    paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.accent, ...SHADOWS.glow,
  },
  processButtonText: { fontSize: FONT_SIZES.md, color: COLORS.textInverse, fontWeight: "700", letterSpacing: 0.3 },
  processingContainer: { alignItems: "center", gap: SPACING.md },
  processingText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
  // Memo
  memoSection: {
    backgroundColor: COLORS.accent + "08",
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  memoTitle: { fontSize: FONT_SIZES.lg, fontWeight: "700", color: COLORS.text, marginBottom: SPACING.md },
  memoText: { fontSize: FONT_SIZES.md, color: COLORS.text, lineHeight: 24 },
  // Results
  resultSection: {
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg, marginTop: SPACING.lg, ...SHADOWS.sm,
  },
  resultTitle: {
    fontSize: FONT_SIZES.sm, fontWeight: "700", color: COLORS.textSecondary,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: SPACING.sm,
  },
  resultText: { fontSize: FONT_SIZES.md, color: COLORS.text, lineHeight: 22 },
  actionItem: { fontSize: FONT_SIZES.md, color: COLORS.text, lineHeight: 24, marginBottom: 4 },
  sentimentBadge: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    marginTop: SPACING.md,
    ...SHADOWS.sm,
  },
  sentimentText: { fontSize: FONT_SIZES.sm, color: COLORS.accent, fontWeight: "600" },
  // Bottom
  bottomActions: {
    flexDirection: "row", gap: SPACING.md, marginTop: SPACING.xxl,
    justifyContent: "center",
  },
  doneButton: {
    backgroundColor: COLORS.accent, borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.xxl, paddingVertical: SPACING.md, ...SHADOWS.glow,
  },
  doneButtonText: { color: COLORS.textInverse, fontSize: FONT_SIZES.md, fontWeight: "700", letterSpacing: 0.3 },
});
