import React from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/hooks/useAuth";
import { Card, Button } from "../../src/components";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from "../../src/constants/theme";
import { CONFIG } from "../../src/constants/config";

export default function ProfileScreen() {
  const { user, signOut, isAuthenticated } = useAuth();

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: signOut },
    ]);
  };

  const initials = user?.name?.split(" ").map((n: string) => n[0]).join("") || "?";

  return (
    <View style={styles.container}>
      {/* Avatar Hero */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarOuter}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          {isAuthenticated && (
            <View style={styles.onlineDot} />
          )}
        </View>
        <Text style={styles.name}>{user?.name || "User"}</Text>
        <Text style={styles.email}>{user?.email || ""}</Text>
        {isAuthenticated && (
          <View style={styles.connectedBadge}>
            <Ionicons name="shield-checkmark" size={13} color={COLORS.success} />
            <Text style={styles.connectedText}>Connected via Azure AD</Text>
          </View>
        )}
      </View>

      {/* Info Card */}
      <Card style={styles.infoCard} shadow="md">
        <View style={styles.infoRow}>
          <View style={styles.infoIconRow}>
            <View style={[styles.infoIcon, { backgroundColor: COLORS.accentSoft }]}>
              <Ionicons name="information-circle-outline" size={18} color={COLORS.accent} />
            </View>
            <Text style={styles.infoLabel}>Version</Text>
          </View>
          <Text style={styles.infoValue}>1.3.0</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <View style={styles.infoIconRow}>
            <View style={[styles.infoIcon, { backgroundColor: COLORS.infoLight }]}>
              <Ionicons name="server-outline" size={18} color={COLORS.info} />
            </View>
            <Text style={styles.infoLabel}>API</Text>
          </View>
          <Text style={styles.infoValue} numberOfLines={1}>
            {CONFIG.API_BASE_URL.replace("https://", "").replace(".azurewebsites.net", "")}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <View style={styles.infoIconRow}>
            <View style={[styles.infoIcon, { backgroundColor: COLORS.successLight }]}>
              <Ionicons name="key-outline" size={18} color={COLORS.success} />
            </View>
            <Text style={styles.infoLabel}>Auth</Text>
          </View>
          <Text style={styles.infoValue}>
            {isAuthenticated ? "Azure AD" : "Offline"}
          </Text>
        </View>
      </Card>

      <View style={{ flex: 1 }} />

      <Button
        title="Sign Out"
        onPress={handleLogout}
        variant="danger"
        icon={<Ionicons name="log-out-outline" size={18} color={COLORS.error} />}
        style={{ marginBottom: SPACING.xxl }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.lg },
  avatarSection: { alignItems: "center", paddingVertical: SPACING.xxl },
  avatarOuter: {
    position: "relative",
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.glow,
  },
  avatarText: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: "800",
    color: COLORS.textInverse,
    letterSpacing: 1,
  },
  onlineDot: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.success,
    borderWidth: 3,
    borderColor: COLORS.background,
  },
  name: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  email: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: "500",
  },
  connectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.successLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    marginTop: SPACING.sm,
  },
  connectedText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.success,
    fontWeight: "700",
  },
  infoCard: {
    marginTop: SPACING.lg,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.sm,
  },
  infoIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: {
    fontSize: FONT_SIZES.md,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  infoValue: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    fontWeight: "500",
    maxWidth: "50%",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: 2,
  },
});
