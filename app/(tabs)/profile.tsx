import React from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { useAuthStore } from "../../src/stores/authStore";
import { Card, Button } from "../../src/components";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "../../src/constants/theme";
import { CONFIG } from "../../src/constants/config";

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert("Déconnexion", "Voulez-vous vraiment vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Déconnexion", style: "destructive", onPress: logout },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.split(" ").map((n) => n[0]).join("") || "?"}
          </Text>
        </View>
        <Text style={styles.name}>{user?.name || "Utilisateur"}</Text>
        <Text style={styles.email}>{user?.email || ""}</Text>
      </View>

      <Card style={{ marginTop: SPACING.xl }}>
        <Text style={styles.sectionTitle}>Application</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Version</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>API</Text>
          <Text style={styles.infoValue} numberOfLines={1}>
            {CONFIG.API_BASE_URL.replace("https://", "")}
          </Text>
        </View>
      </Card>

      <Button
        title="Se déconnecter"
        onPress={handleLogout}
        variant="danger"
        style={{ marginTop: SPACING.xxl }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.lg },
  avatarSection: { alignItems: "center", paddingVertical: SPACING.xxl },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  avatarText: { fontSize: FONT_SIZES.xxl, fontWeight: "700", color: COLORS.textInverse },
  name: { fontSize: FONT_SIZES.xl, fontWeight: "700", color: COLORS.text },
  email: { fontSize: FONT_SIZES.md, color: COLORS.textMuted, marginTop: 2 },
  sectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: SPACING.sm,
  },
  infoLabel: { fontSize: FONT_SIZES.md, color: COLORS.textSecondary },
  infoValue: { fontSize: FONT_SIZES.md, color: COLORS.text, fontWeight: "500", maxWidth: "60%" },
});
