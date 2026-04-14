export const COLORS = {
  // Brand gradient - deep navy to electric indigo
  primary: "#0f0f23",
  primaryLight: "#1e1e3f",
  primaryMid: "#16213e",
  accent: "#6366f1",       // Indigo 500 — more vibrant
  accentLight: "#a5b4fc",  // Indigo 300
  accentDark: "#4f46e5",   // Indigo 600
  accentSoft: "#eef2ff",   // Indigo 50

  success: "#10b981",      // Emerald 500
  successLight: "#d1fae5",
  warning: "#f59e0b",      // Amber 500
  warningLight: "#fef3c7",
  error: "#ef4444",        // Red 500
  errorLight: "#fee2e2",
  info: "#3b82f6",         // Blue 500
  infoLight: "#dbeafe",

  background: "#f1f5f9",   // Slate 100 — slightly warmer
  surface: "#ffffff",
  surfaceElevated: "#f8fafc",
  surfaceCard: "#ffffff",
  border: "#e2e8f0",
  borderLight: "#f1f5f9",
  borderAccent: "#c7d2fe",  // Subtle indigo border

  text: "#0f172a",
  textSecondary: "#475569",  // Slate 600 — darker for readability
  textMuted: "#94a3b8",
  textInverse: "#ffffff",

  // Gradients (used as LinearGradient stops)
  gradientStart: "#6366f1",
  gradientEnd: "#8b5cf6",    // Purple 500
  gradientDark: "#0f0f23",
  gradientDarkEnd: "#1e1e3f",

  // Sentiment
  sentimentPositive: "#10b981",
  sentimentNeutral: "#64748b",
  sentimentCautious: "#f59e0b",
  sentimentNegative: "#ef4444",
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const FONT_SIZES = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  hero: 40,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const SHADOWS = {
  sm: {
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  glow: {
    shadowColor: "#6366f1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
};
