import React, { useState, useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, Image,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { useRouter, useLocalSearchParams } from "expo-router";
import { api } from "../../src/services/api";
import { useEventStore } from "../../src/stores/eventStore";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "../../src/constants/theme";
import type { PhotoType } from "../../src/types";

export default function CameraScreen() {
  const router = useRouter();
  const { type: initialType } = useLocalSearchParams<{ type?: string }>();
  const cameraRef = useRef<any>(null);
  const setPendingOcrResult = useEventStore((s) => s.setPendingOcrResult);
  const setPendingPortraitUrl = useEventStore((s) => s.setPendingPortraitUrl);
  const [permission, requestPermission] = useCameraPermissions();
  const [photoType, setPhotoType] = useState<PhotoType>((initialType as PhotoType) || "badge");
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<any>(null);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          Camera access is required to take photos of badges and business cards.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });
      setCapturedUri(photo.uri);
    } catch (err: any) {
      Alert.alert("Error", "Unable to take photo.");
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setCapturedUri(result.assets[0].uri);
    }
  };

  const processPhoto = async () => {
    if (!capturedUri) return;
    setProcessing(true);

    try {
      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(capturedUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Upload photo
      const filename = `${photoType}_${Date.now()}.jpg`;
      const uploadResult = await api.uploadPhoto(base64, filename, "image/jpeg");

      // If badge or business card, run OCR
      if (photoType !== "portrait") {
        const ocrData = await api.ocrBadge(uploadResult.imageUrl, photoType);
        setOcrResult(ocrData);

        // Store OCR result in Zustand so quick-capture can use it
        setPendingOcrResult({
          parsed: ocrData.parsed,
          rawText: ocrData.rawText,
          photoUri: capturedUri,
          photoType,
        });

        Alert.alert(
          "Contact Detected",
          `${ocrData.parsed.name || "Unknown name"}${ocrData.parsed.company ? `\n${ocrData.parsed.company}` : ""}${ocrData.parsed.title ? ` — ${ocrData.parsed.title}` : ""}${ocrData.parsed.email ? `\n${ocrData.parsed.email}` : ""}`,
          [
            { text: "Retake", onPress: () => { setCapturedUri(null); setOcrResult(null); setPendingOcrResult(null); } },
            { text: "Add to contact", onPress: () => router.back() },
          ]
        );
      } else {
        // Portrait mode: store the uploaded URL so quick-capture can attach it to a participant
        setPendingPortraitUrl(uploadResult.imageUrl);
        // Navigate back immediately — the capture form will handle participant assignment
        router.back();
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Processing failed.");
    } finally {
      setProcessing(false);
    }
  };

  // Preview mode after capture
  if (capturedUri) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: capturedUri }} style={styles.preview} resizeMode="contain" />

        {processing ? (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.processingText}>
              {photoType === "portrait" ? "Upload..." : "OCR processing..."}
            </Text>
          </View>
        ) : (
          <View style={styles.previewControls}>
            <TouchableOpacity
              style={styles.retakeButton}
              onPress={() => { setCapturedUri(null); setOcrResult(null); }}
            >
              <Text style={styles.retakeText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.useButton} onPress={processPhoto}>
              <Text style={styles.useButtonText}>
                {photoType === "portrait" ? "Save" : "Run OCR"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // Camera view
  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
      >
        {/* Photo type selector */}
        <View style={styles.typeSelector}>
          {(["badge", "business_card", "portrait"] as PhotoType[]).map((type) => {
            const labels: Record<PhotoType, string> = {
              badge: "Badge",
              business_card: "Business Card",
              portrait: "Portrait",
            };
            return (
              <TouchableOpacity
                key={type}
                style={[styles.typePill, photoType === type && styles.typePillActive]}
                onPress={() => setPhotoType(type)}
              >
                <Text style={[styles.typePillText, photoType === type && styles.typePillTextActive]}>
                  {labels[type]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Guide overlay */}
        {photoType !== "portrait" && (
          <View style={styles.guideOverlay}>
            <View style={styles.guideRect} />
            <Text style={styles.guideText}>
              {photoType === "badge" ? "Frame the badge" : "Frame the business card"}
            </Text>
          </View>
        )}
      </CameraView>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.galleryButton} onPress={pickFromGallery}>
          <Text style={styles.galleryText}>Gallery</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  permissionContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xxl,
  },
  permissionText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: SPACING.xl,
  },
  permissionButton: {
    backgroundColor: COLORS.accent,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  permissionButtonText: { color: COLORS.textInverse, fontWeight: "700" },
  typeSelector: {
    flexDirection: "row",
    justifyContent: "center",
    gap: SPACING.sm,
    paddingTop: 60,
  },
  typePill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  typePillActive: { backgroundColor: COLORS.accent },
  typePillText: { color: "rgba(255,255,255,0.7)", fontSize: FONT_SIZES.sm },
  typePillTextActive: { color: "#fff", fontWeight: "700" },
  guideOverlay: { flex: 1, alignItems: "center", justifyContent: "center" },
  guideRect: {
    width: "85%",
    height: 200,
    borderWidth: 2,
    borderColor: COLORS.accent + "80",
    borderRadius: BORDER_RADIUS.lg,
    borderStyle: "dashed",
  },
  guideText: {
    color: "#fff",
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.md,
    textShadowColor: "#000",
    textShadowRadius: 4,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: SPACING.xl,
    paddingBottom: 40,
    backgroundColor: "#000",
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  captureButtonInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#fff",
  },
  galleryButton: { paddingHorizontal: SPACING.lg },
  galleryText: { color: "#fff", fontSize: FONT_SIZES.sm },
  closeButton: { paddingHorizontal: SPACING.lg },
  closeText: { color: "#fff", fontSize: FONT_SIZES.sm },
  preview: { flex: 1 },
  previewControls: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: SPACING.xl,
    paddingBottom: 40,
    backgroundColor: "#000",
  },
  retakeButton: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: "#fff",
  },
  retakeText: { color: "#fff", fontWeight: "600" },
  useButton: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.accent,
  },
  useButtonText: { color: "#fff", fontWeight: "700" },
  processingOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.8)",
    padding: SPACING.xxl,
    alignItems: "center",
  },
  processingText: { color: "#fff", marginTop: SPACING.md, fontSize: FONT_SIZES.md },
});
