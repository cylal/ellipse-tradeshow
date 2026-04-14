import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra || {};

export const CONFIG = {
  // API
  API_BASE_URL: extra.apiBaseUrl || "https://ellipse-crm-api.azurewebsites.net/api",

  // Azure AD / MSAL
  MSAL_CLIENT_ID: extra.msalClientId || "f48f00d7-5e7b-4db4-92a4-782638db53a4",
  MSAL_AUTHORITY: extra.msalAuthority || "https://login.microsoftonline.com/b1bfd5bc-237f-471f-a047-9af9ab859733",
  MSAL_REDIRECT_URI: extra.msalRedirectUri || "msauth.la.ellipse.tradeshow://auth",
  MSAL_SCOPES: ["api://f48f00d7-5e7b-4db4-92a4-782638db53a4/access_as_user"],

  // Offline
  MAX_RETRY_COUNT: 3,
  SYNC_INTERVAL_MS: 30000, // 30 seconds
  MAX_AUDIO_DURATION_MS: 3600000, // 1 hour
  MAX_PHOTO_SIZE_MB: 10,

  // UI
  ENCOUNTER_TYPES: [
    { value: "meeting", label: "Meeting", icon: "calendar" },
    { value: "booth_visit", label: "Booth Visit", icon: "store" },
    { value: "other", label: "Other", icon: "more-horizontal" },
  ] as const,

  PRIORITY_OPTIONS: [
    { value: "high", label: "High", color: "#ef4444" },
    { value: "medium", label: "Medium", color: "#f59e0b" },
    { value: "low", label: "Low", color: "#22c55e" },
  ] as const,
} as const;
