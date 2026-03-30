import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator,
} from "react-native";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { useRouter } from "expo-router";
import { api } from "../../src/services/api";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from "../../src/constants/theme";

type RecordingState = "idle" | "recording" | "paused" | "stopped";

export default function AudioRecordScreen() {
  const router = useRouter();
  const recordingRef = useRef<Audio.Recording | null>(null);

  const [state, setState] = useState<RecordingState>("idle");
  const [duration, setDuration] = useState(0);
  const [uri, setUri] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [transcriptResult, setTranscriptResult] = useState<string | null>(null);
  const [summaryResult, setSummaryResult] = useState<any>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
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
        Alert.alert("Permission requise", "Le microphone est nécessaire pour enregistrer.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

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
      Alert.alert("Erreur", err.message || "Impossible de démarrer l'enregistrement.");
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
      // Read as base64 and upload
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const filename = `encounter_audio_${Date.now()}.m4a`;
      const uploadResult = await api.uploadAudio(base64, filename, "audio/m4a");

      // Transcribe
      const transcription = await api.transcribeAudio(uploadResult.audioUrl);
      setTranscriptResult(transcription.transcript);

      // Summarize
      if (transcription.transcript) {
        const summary = await api.summarizeEncounter(transcription.transcript);
        setSummaryResult(summary);
      }

      Alert.alert("Traitement terminé", "Transcription et résumé AI générés.");
    } catch (err: any) {
      Alert.alert("Erreur", err.message || "Échec du traitement audio.");
    } finally {
      setProcessing(false);
    }
  };

  const resetRecording = () => {
    setState("idle");
    setDuration(0);
    setUri(null);
    setTranscriptResult(null);
    setSummaryResult(null);
  };

  return (
    <View style={styles.container}>
      {/* Timer display */}
      <View style={styles.timerSection}>
        <Text style={styles.timer}>{formatTime(duration)}</Text>
        <Text style={styles.stateLabel}>
          {state === "idle" && "Prêt à enregistrer"}
          {state === "recording" && "🔴 Enregistrement en cours"}
          {state === "paused" && "⏸ En pause"}
          {state === "stopped" && "Enregistrement terminé"}
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
              <Text style={styles.secondaryButtonText}>⏸ Pause</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
              <View style={styles.stopSquare} />
            </TouchableOpacity>
          </View>
        )}

        {state === "paused" && (
          <View style={styles.controlRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={resumeRecording}>
              <Text style={styles.secondaryButtonText}>▶ Reprendre</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
              <View style={styles.stopSquare} />
            </TouchableOpacity>
          </View>
        )}

        {state === "stopped" && !processing && (
          <View style={styles.controlRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={resetRecording}>
              <Text style={styles.secondaryButtonText}>Recommencer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.processButton} onPress={processAudio}>
              <Text style={styles.processButtonText}>🤖 Transcrire + Résumer</Text>
            </TouchableOpacity>
          </View>
        )}

        {processing && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.processingText}>Transcription et analyse AI en cours...</Text>
          </View>
        )}
      </View>

      {/* Results */}
      {transcriptResult && (
        <View style={styles.resultSection}>
          <Text style={styles.resultTitle}>Transcription</Text>
          <Text style={styles.resultText} numberOfLines={6}>{transcriptResult}</Text>
        </View>
      )}

      {summaryResult && (
        <View style={styles.resultSection}>
          <Text style={styles.resultTitle}>Résumé AI</Text>
          <Text style={styles.resultText} numberOfLines={4}>{summaryResult.summary}</Text>
          {summaryResult.sentiment && (
            <Text style={styles.sentimentText}>Sentiment: {summaryResult.sentiment}</Text>
          )}
        </View>
      )}

      {(transcriptResult || summaryResult) && (
        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => router.back()}
        >
          <Text style={styles.doneButtonText}>Terminé</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.lg },
  timerSection: { alignItems: "center", paddingTop: SPACING.xxxl, paddingBottom: SPACING.xl },
  timer: { fontSize: 64, fontWeight: "200", color: COLORS.text, fontVariant: ["tabular-nums"] },
  stateLabel: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary, marginTop: SPACING.sm },
  waveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: SPACING.xl,
    height: 40,
  },
  waveBar: {
    width: 4,
    backgroundColor: COLORS.error,
    borderRadius: 2,
  },
  controls: { alignItems: "center", paddingVertical: SPACING.xl },
  controlRow: { flexDirection: "row", gap: SPACING.xl, alignItems: "center" },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: COLORS.error,
    alignItems: "center",
    justifyContent: "center",
  },
  recordDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.error,
  },
  stopButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: COLORS.error,
    alignItems: "center",
    justifyContent: "center",
  },
  stopSquare: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: COLORS.error,
  },
  secondaryButton: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  secondaryButtonText: { fontSize: FONT_SIZES.md, color: COLORS.text, fontWeight: "600" },
  processButton: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.accent,
    ...SHADOWS.md,
  },
  processButtonText: { fontSize: FONT_SIZES.md, color: COLORS.textInverse, fontWeight: "700" },
  processingContainer: { alignItems: "center", gap: SPACING.md },
  processingText: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
  resultSection: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
    ...SHADOWS.sm,
  },
  resultTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  resultText: { fontSize: FONT_SIZES.md, color: COLORS.text, lineHeight: 22 },
  sentimentText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.accent,
    fontWeight: "600",
    marginTop: SPACING.sm,
  },
  doneButton: {
    backgroundColor: COLORS.accent,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    alignItems: "center",
    marginTop: SPACING.xl,
    ...SHADOWS.md,
  },
  doneButtonText: { color: COLORS.textInverse, fontSize: FONT_SIZES.md, fontWeight: "700" },
});
