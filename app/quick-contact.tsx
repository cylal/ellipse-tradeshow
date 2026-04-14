import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert,
  KeyboardAvoidingView, Platform, TextInput, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEventStore } from "../src/stores/eventStore";
import { Button, Card, Input } from "../src/components";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from "../src/constants/theme";
import { api } from "../src/services/api";

/**
 * Convert a string to Title Case, handling accented characters.
 * "JUAN MANUEL PÉREZ" → "Juan Manuel Pérez"
 * Leaves mixed-case strings as-is (e.g. "McDonald" stays "McDonald").
 */
function toTitleCase(str: string): string {
  if (!str) return str;
  // Only transform if the string is ALL CAPS or all lowercase
  const isAllUpper = str === str.toUpperCase() && str !== str.toLowerCase();
  const isAllLower = str === str.toLowerCase() && str !== str.toUpperCase();
  if (!isAllUpper && !isAllLower) return str; // mixed case — leave as-is
  return str
    .toLowerCase()
    .replace(/(^|\s|[-'])\S/g, (match) => match.toUpperCase());
}

export default function QuickContactScreen() {
  const router = useRouter();

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [memo, setMemo] = useState("");

  // OCR
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const pendingOcrResult = useEventStore((s) => s.pendingOcrResult);
  const setPendingOcrResult = useEventStore((s) => s.setPendingOcrResult);
  const pendingPortraitUrl = useEventStore((s) => s.pendingPortraitUrl);
  const setPendingPortraitUrl = useEventStore((s) => s.setPendingPortraitUrl);

  // Submit
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [wasUpdate, setWasUpdate] = useState(false);

  // Pick up OCR results from camera
  useEffect(() => {
    if (pendingOcrResult?.parsed) {
      const p = pendingOcrResult.parsed;
      if (p.name) {
        const parts = toTitleCase(p.name.trim()).split(/\s+/);
        if (parts.length >= 2) {
          setFirstName(parts[0]);
          setLastName(parts.slice(1).join(" "));
        } else {
          setLastName(parts[0]);
        }
      }
      if (p.company) setCompany(p.company);
      if (p.title) setTitle(toTitleCase(p.title));
      if (p.email) setEmail(p.email);
      if (p.phone) setPhone(p.phone);
      if (p.website) setWebsite(p.website);
      if (p.address) setAddress(p.address);
      setScanned(true);
      setPendingOcrResult(null);
    }
  }, [pendingOcrResult]);

  const handleScan = () => {
    router.push("/capture/camera?type=business_card&returnTo=quick-contact");
  };

  const handleSubmit = async () => {
    if (!lastName.trim()) {
      Alert.alert("Error", "Name is required");
      return;
    }

    setSaving(true);
    try {
      // Check for duplicates first
      try {
        const dupResult = await api.checkDuplicate({
          email: email.trim() || undefined,
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim(),
        });
        const duplicates = dupResult.duplicate;
        if (duplicates && Array.isArray(duplicates) && duplicates.length > 0) {
          const dup = duplicates[0].contact;
          const dupName = `${dup.firstName || ""} ${dup.lastName || ""}`.trim();
          const dupCompany = dup.accountName ? ` (${dup.accountName})` : "";

          return new Promise<void>((resolve) => {
            Alert.alert(
              "Duplicate detected",
              `A contact "${dupName}${dupCompany}" already exists in the database.\n\nDo you want to update their information with the new details?`,
              [
                {
                  text: "Cancel",
                  style: "cancel",
                  onPress: () => { setSaving(false); resolve(); },
                },
                {
                  text: "Update",
                  onPress: async () => {
                    try {
                      await doUpdateExistingContact(dup.id);
                    } finally {
                      resolve();
                    }
                  },
                },
              ]
            );
          });
        }
      } catch {
        // If duplicate check fails, proceed with creation anyway
      }

      await doCreateContact();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Unable to create contact");
      setSaving(false);
    }
  };

  const doCreateContact = async () => {
    try {
      const contactData: any = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        title: title.trim() || undefined,
        email: email.trim() || "",
        accountName: company.trim() || undefined,
        leadSource: "tradeshow" as const,
        leadSourceDetail: "quick_contact",
        contactType: "sales" as const,
        // region is omitted — backend defaults to the authenticated user's own region
        tags: memo.trim() ? ["quick_contact"] : ["quick_contact"],
      };

      if (phone.trim()) {
        contactData.phones = [{ type: "mobile", value: phone.trim() }];
      }
      if (address.trim()) {
        contactData.addresses = [{ type: "professional", street: address.trim() }];
      }

      await api.createContact(contactData);
      setSuccess(true);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Unable to create contact");
    } finally {
      setSaving(false);
    }
  };

  const doUpdateExistingContact = async (existingId: string) => {
    try {
      const updateData: any = {};
      // Only send non-empty fields to update
      if (firstName.trim()) updateData.firstName = firstName.trim();
      if (lastName.trim()) updateData.lastName = lastName.trim();
      if (title.trim()) updateData.title = title.trim();
      if (email.trim()) updateData.email = email.trim();
      if (company.trim()) updateData.accountName = company.trim();
      if (phone.trim()) {
        updateData.phones = [{ type: "mobile", value: phone.trim() }];
      }
      if (address.trim()) {
        updateData.addresses = [{ type: "professional", street: address.trim() }];
      }

      await api.updateContact(existingId, updateData);
      setWasUpdate(true);
      setSuccess(true);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Unable to update contact");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFirstName(""); setLastName(""); setCompany(""); setTitle("");
    setEmail(""); setPhone(""); setWebsite(""); setAddress(""); setMemo("");
    setScanned(false); setSuccess(false); setWasUpdate(false);
    setPendingPortraitUrl(null);
  };

  // ── Success screen ──
  if (success) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={56} color={COLORS.success} />
          </View>
          <Text style={styles.successTitle}>{wasUpdate ? "Contact updated!" : "Contact created!"}</Text>
          <Text style={styles.successSub}>
            {firstName} {lastName} {wasUpdate ? "was updated" : "was added to CRM"}
          </Text>
          <View style={styles.successActions}>
            <Button title="Scan another" onPress={handleReset} variant="primary" />
            <Button title="Back" onPress={() => router.back()} variant="outline" />
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Scan zone */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="camera" size={18} color={CARD_THEMES.contact.iconColor} />
            <Text style={styles.sectionTitle}>Scan a business card</Text>
          </View>
          <TouchableOpacity style={styles.scanArea} onPress={handleScan} activeOpacity={0.7}>
            {scanned ? (
              <>
                <View style={[styles.scanIconBox, { backgroundColor: COLORS.successLight }]}>
                  <Ionicons name="checkmark-circle" size={28} color={COLORS.success} />
                </View>
                <Text style={[styles.scanText, { color: COLORS.success }]}>Card scanned — Fields pre-filled</Text>
                <Text style={styles.scanSub}>Tap to rescan</Text>
              </>
            ) : (
              <>
                <View style={styles.scanIconBox}>
                  <Ionicons name="camera" size={28} color={CARD_THEMES.contact.iconColor} />
                </View>
                <Text style={styles.scanText}>Take a photo</Text>
                <Text style={styles.scanSub}>Fields will be pre-filled by OCR</Text>
              </>
            )}
          </TouchableOpacity>
        </Card>

        {/* Contact form */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person" size={18} color={CARD_THEMES.contact.iconColor} />
            <Text style={styles.sectionTitle}>Contact information</Text>
          </View>
          <View style={styles.formRow}>
            <View style={styles.formHalf}>
              <Input label="First name" value={firstName} onChangeText={setFirstName} placeholder="First name" />
            </View>
            <View style={styles.formHalf}>
              <Input label="Last name *" value={lastName} onChangeText={setLastName} placeholder="Last name" />
            </View>
          </View>
          <View style={styles.formRow}>
            <View style={styles.formHalf}>
              <Input label="Company" value={company} onChangeText={setCompany} placeholder="Company" />
            </View>
            <View style={styles.formHalf}>
              <Input label="Job title" value={title} onChangeText={setTitle} placeholder="Job title" />
            </View>
          </View>
          <Input label="Email" value={email} onChangeText={setEmail} placeholder="email@example.com" />
          <Input label="Phone" value={phone} onChangeText={setPhone} placeholder="+33 6 00 00 00 00" />
          <Input label="Website" value={website} onChangeText={setWebsite} placeholder="www.example.com" />
          <Input label="Address" value={address} onChangeText={setAddress} placeholder="Full address" />
        </Card>

        {/* Memo */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="chatbubble" size={18} color={CARD_THEMES.contact.iconColor} />
            <Text style={styles.sectionTitle}>Memo (optional)</Text>
          </View>
          <TextInput
            style={styles.memoInput}
            value={memo}
            onChangeText={setMemo}
            placeholder="Notes, meeting context..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </Card>

        {/* Submit */}
        <View style={styles.submitRow}>
          <Button
            title={saving ? "Creating..." : "Create contact"}
            onPress={handleSubmit}
            variant="primary"
            disabled={saving || !lastName.trim()}
            loading={saving}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const CARD_THEMES = {
  contact: {
    iconColor: "#f97316",
    iconBg: "#ffedd5",
  },
};

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

  // Scan area
  scanArea: {
    alignItems: "center",
    padding: SPACING.xl,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  scanIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#ffedd5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.xs,
  },
  scanText: {
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    color: COLORS.text,
  },
  scanSub: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
  },

  // Form
  formRow: {
    flexDirection: "row",
    gap: SPACING.md,
    marginBottom: 0,
  },
  formHalf: {
    flex: 1,
  },

  // Memo
  memoInput: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    minHeight: 80,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // Submit
  submitRow: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.xxl,
  },

  // Success
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xxl,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.successLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.lg,
  },
  successTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  successSub: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
    textAlign: "center",
  },
  successActions: {
    gap: SPACING.md,
    width: "100%",
  },
});
