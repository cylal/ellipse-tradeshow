import React, { useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from "../src/constants/theme";
import { useAuth } from "../src/hooks/useAuth";

export default function LoginScreen() {
  const {
    signIn, signInWithBiometric, isLoading, isReady, authError,
    biometricEnabled, hasSavedSession,
  } = useAuth();

  const biometricTriggered = useRef(false);

  // Auto-trigger Face ID if biometric is enabled and we have a saved session
  useEffect(() => {
    if (biometricEnabled && hasSavedSession && !biometricTriggered.current && !isLoading) {
      biometricTriggered.current = true;
      // Small delay to let the screen render first
      const timer = setTimeout(() => {
        signInWithBiometric();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [biometricEnabled, hasSavedSession, isLoading]);

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.logo}>Ellipse</Text>
        <Text style={styles.title}>TradeShow Companion</Text>
        <Text style={styles.subtitle}>
          Capture your tradeshow meetings and sync them with your CRM
        </Text>
      </View>

      <View style={styles.actions}>
        {isLoading ? (
          <>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.loadingText}>Signing in...</Text>
          </>
        ) : (
          <>
            {/* Face ID button — shown when biometric is enabled and session exists */}
            {biometricEnabled && hasSavedSession && (
              <TouchableOpacity
                style={styles.biometricButton}
                onPress={signInWithBiometric}
                activeOpacity={0.8}
              >
                <Ionicons name="scan-outline" size={32} color="#ffffff" style={{ marginBottom: 8 }} />
                <Text style={styles.biometricButtonText}>Sign in with Face ID</Text>
              </TouchableOpacity>
            )}

            {/* Microsoft login button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                !isReady && styles.loginButtonDisabled,
                biometricEnabled && hasSavedSession && styles.loginButtonSecondary,
              ]}
              onPress={signIn}
              disabled={!isReady}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.loginButtonText,
                biometricEnabled && hasSavedSession && styles.loginButtonTextSecondary,
              ]}>
                {biometricEnabled && hasSavedSession
                  ? "Sign in with Microsoft"
                  : "Sign in with Microsoft"}
              </Text>
            </TouchableOpacity>

            {!!authError && (
              <Text style={styles.errorText}>{authError}</Text>
            )}

            <Text style={styles.hint}>
              Use your Ellipse World account
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
    justifyContent: "space-between",
    padding: SPACING.xl,
    paddingTop: 120,
    paddingBottom: 80,
  },
  hero: {
    alignItems: "center",
  },
  logo: {
    fontSize: 42,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 2,
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: "600",
    color: "#ffffff",
    opacity: 0.9,
    marginBottom: SPACING.lg,
  },
  subtitle: {
    fontSize: FONT_SIZES.md,
    color: "#ffffff",
    opacity: 0.7,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: SPACING.xl,
  },
  actions: {
    alignItems: "center",
  },
  biometricButton: {
    alignItems: "center",
    marginBottom: SPACING.xl,
    paddingVertical: SPACING.lg,
  },
  biometricButtonText: {
    color: "#ffffff",
    fontSize: FONT_SIZES.md,
    fontWeight: "600",
    opacity: 0.9,
  },
  loginButton: {
    width: "100%",
    backgroundColor: "#ffffff",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  loginButtonDisabled: {
    opacity: 0.5,
  },
  loginButtonSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.4)",
  },
  loginButtonText: {
    color: COLORS.primary,
    fontSize: FONT_SIZES.md,
    fontWeight: "700",
  },
  loginButtonTextSecondary: {
    color: "#ffffff",
    opacity: 0.8,
  },
  loadingText: {
    color: "#ffffff",
    opacity: 0.7,
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.sm,
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.md,
    textAlign: "center",
  },
  hint: {
    fontSize: FONT_SIZES.sm,
    color: "#ffffff",
    opacity: 0.5,
    marginTop: SPACING.md,
  },
});
