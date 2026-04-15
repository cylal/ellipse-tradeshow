import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { api } from "../services/api";

const USER_KEY = "ellipse_user_info";
const BIOMETRIC_KEY = "ellipse_biometric_enabled";
// This key is stored with requireAuthentication — reading it triggers Face ID
const BIOMETRIC_GATE_KEY = "ellipse_biometric_gate";

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  biometricEnabled: boolean;
  hasSavedSession: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  enableBiometric: () => Promise<void>;
  restoreSession: () => Promise<boolean>;
  loginWithBiometric: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Register auth expiry callback — auto-logout when backend rejects token
  api.onAuthExpired(() => {
    const { logout } = get();
    logout();
  });

  return {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  biometricEnabled: false,
  hasSavedSession: false,

  login: async (token: string, user: User) => {
    await api.setToken(token);
    api.setUserInfo(user.name, user.email);
    // Save user info for session restore
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    set({ user, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    await api.clearToken();
    await SecureStore.deleteItemAsync(USER_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_GATE_KEY).catch(() => {});
    set({ user: null, isAuthenticated: false, isLoading: false, biometricEnabled: false, hasSavedSession: false });
  },

  setLoading: (loading: boolean) => set({ isLoading: loading }),

  enableBiometric: async () => {
    await SecureStore.setItemAsync(BIOMETRIC_KEY, "true");
    // Store a biometric-protected value — reading this will trigger Face ID
    if (Platform.OS === "ios") {
      await SecureStore.setItemAsync(BIOMETRIC_GATE_KEY, "authorized", {
        requireAuthentication: true,
        authenticationPrompt: "Connectez-vous avec Face ID",
      });
    }
    set({ biometricEnabled: true });
  },

  // Check if we have a saved session — called on app start
  restoreSession: async () => {
    try {
      const [userJson, biometricFlag, token] = await Promise.all([
        SecureStore.getItemAsync(USER_KEY),
        SecureStore.getItemAsync(BIOMETRIC_KEY),
        SecureStore.getItemAsync("ellipse_access_token"),
      ]);

      const hasSaved = !!(userJson && token);
      // Only consider biometric enabled if we also have a valid saved session
      const bioEnabled = biometricFlag === "true" && hasSaved;

      set({ biometricEnabled: bioEnabled, hasSavedSession: hasSaved });

      // If biometric not enabled but we have a session, restore silently
      if (hasSaved && !bioEnabled) {
        const user = JSON.parse(userJson!) as User;
        api.setUserInfo(user.name, user.email);
        set({ user, isAuthenticated: true, isLoading: false });
        return true;
      }

      // If biometric enabled, wait for Face ID — handled by login screen
      if (hasSaved && bioEnabled) {
        set({ isLoading: false });
        return false;
      }

      // No saved session
      set({ isLoading: false });
      return false;
    } catch {
      set({ isLoading: false, hasSavedSession: false });
      return false;
    }
  },

  // Restore session after Face ID — reading the biometric gate triggers Face ID
  loginWithBiometric: async () => {
    try {
      // This call triggers Face ID because the key was stored with requireAuthentication
      const gateValue = await SecureStore.getItemAsync(BIOMETRIC_GATE_KEY, {
        requireAuthentication: true,
        authenticationPrompt: "Connectez-vous avec Face ID",
      });

      if (!gateValue) return false;

      // Face ID passed — restore session
      const [userJson, token] = await Promise.all([
        SecureStore.getItemAsync(USER_KEY),
        SecureStore.getItemAsync("ellipse_access_token"),
      ]);

      if (!userJson || !token) return false;

      const user = JSON.parse(userJson) as User;
      await api.setToken(token);
      api.setUserInfo(user.name, user.email);
      set({ user, isAuthenticated: true, isLoading: false });
      return true;
    } catch {
      // Face ID cancelled or failed
      return false;
    }
  },
  };
});
