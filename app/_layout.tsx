import React from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import * as FileSystem from "expo-file-system";
import { COLORS } from "../src/constants/theme";
import { useAuthStore } from "../src/stores/authStore";
import { ErrorBoundary } from "../src/components/ErrorBoundary";

/**
 * iOS Keychain persists across app reinstalls — clear stale tokens on fresh install.
 * FileSystem.documentDirectory IS cleared on uninstall, so we use a marker file
 * to detect fresh installs and purge stale Keychain entries.
 */
async function clearKeychainIfFreshInstall(): Promise<void> {
  const markerPath = `${FileSystem.documentDirectory}.ellipse_launched`;
  const info = await FileSystem.getInfoAsync(markerPath);
  if (!info.exists) {
    // Fresh install or reinstall — purge any stale Keychain entries
    await SecureStore.deleteItemAsync("ellipse_access_token").catch(() => {});
    await SecureStore.deleteItemAsync("ellipse_user_info").catch(() => {});
    await SecureStore.deleteItemAsync("ellipse_biometric_enabled").catch(() => {});
    await SecureStore.deleteItemAsync("ellipse_biometric_gate").catch(() => {});
    await FileSystem.writeAsStringAsync(markerPath, "1");
  }
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inLoginPage = segments[0] === "login";

    if (!isAuthenticated && !inLoginPage) {
      router.replace("/login");
    } else if (isAuthenticated && inLoginPage) {
      router.replace("/");
    }
  }, [isAuthenticated, isLoading, segments]);

  return <>{children}</>;
}

function CloseButton() {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.back()}
      style={{ padding: 4 }}
    >
      <Ionicons name="close" size={24} color={COLORS.textInverse} />
    </TouchableOpacity>
  );
}

export default function RootLayout() {
  const { restoreSession } = useAuthStore();

  useEffect(() => {
    // Clear stale Keychain on fresh install (iOS keeps Keychain after uninstall)
    // then try to restore a saved session
    clearKeychainIfFreshInstall().then(() => restoreSession());
  }, []);

  return (
    <ErrorBoundary>
      <StatusBar style="light" />
      <AuthGate>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: COLORS.primary },
            headerTintColor: COLORS.textInverse,
            headerTitleStyle: { fontWeight: "600" },
            contentStyle: { backgroundColor: COLORS.background },
          }}
        >
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="events"
            options={{ title: "Conferences" }}
          />
          <Stack.Screen
            name="meetings"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="quick-contact"
            options={{
              title: "New Contact",
              presentation: "modal",
              headerLeft: () => <CloseButton />,
            }}
          />
          <Stack.Screen
            name="event/[id]"
            options={{ title: "Event Details" }}
          />
          <Stack.Screen
            name="event/new"
            options={{ title: "New Event", presentation: "modal" }}
          />
          <Stack.Screen
            name="encounter/[id]"
            options={{ title: "Encounter Details" }}
          />
          <Stack.Screen
            name="capture/index"
            options={{
              title: "New Encounter",
              presentation: "modal",
              headerLeft: () => <CloseButton />,
            }}
          />
          <Stack.Screen
            name="capture/camera"
            options={{
              title: "Photo",
              presentation: "fullScreenModal",
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="capture/audio"
            options={{
              title: "Audio Recording",
              presentation: "fullScreenModal",
            }}
          />
        </Stack>
      </AuthGate>
    </ErrorBoundary>
  );
}
