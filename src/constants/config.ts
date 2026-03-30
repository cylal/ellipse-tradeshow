import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra || {};

export const CONFIG = {
  // API
  API_BASE_URL: extra.apiBaseUrl || "https://ellipse-crm-api.azurewebsites.net/api",

  // Azure AD / MSAL
  MSAL_CLIENT_ID: extra.msalClientId || "YOUR_CLIENT_ID",
  MSAL_AUTHORITY: extra.msalAuthority || "https://login.microsoftonline.com/YOUR_TENANT_ID",
  MSAL_REDIRECT_URI: extra.msalRedirectUri || "msauth.la.ellipse.tradeshow://auth",
  MSAL_SCOPES: ["api://YOUR_CLIENT_ID/access_as_user"],

  // Offline
  MAX_RETRY_COUNT: 3,
  SYNC_INTERVAL_MS: 30000, // 30 seconds
  MAX_AUDIO_DURATION_MS: 3600000, // 1 hour
  MAX_PHOTO_SIZE_MB: 10,

  // UI
  ENCOUNTER_TYPES: [
    { value: "meeting", label: "Rendez-vous", icon: "calendar" },
    { value: "booth_visit", label: "Visite stand", icon: "store" },
    { value: "networking", label: "Networking", icon: "users" },
    { value: "presentation", label: "Présentation", icon: "monitor" },
    { value: "other", label: "Autre", icon: "more-horizontal" },
  ] as const,

  PRIORITY_OPTIONS: [
    { value: "high", label: "Haute", color: "#ef4444" },
    { value: "medium", label: "Moyenne", color: "#f59e0b" },
    { value: "low", label: "Basse", color: "#22c55e" },
  ] as const,
} as const;
