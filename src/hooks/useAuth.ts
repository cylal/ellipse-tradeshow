import { useEffect, useCallback, useState } from "react";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { Alert } from "react-native";
import { useAuthStore } from "../stores/authStore";
import { CONFIG } from "../constants/config";

WebBrowser.maybeCompleteAuthSession();

const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: `${CONFIG.MSAL_AUTHORITY}/oauth2/v2.0/authorize`,
  tokenEndpoint: `${CONFIG.MSAL_AUTHORITY}/oauth2/v2.0/token`,
  revocationEndpoint: `${CONFIG.MSAL_AUTHORITY}/oauth2/v2.0/logout`,
};

// Base64 decode safe for Hermes (atob not available in JSC/Hermes Release)
function base64Decode(input: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let str = input.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4 !== 0) str += "=";

  let output = "";
  for (let i = 0; i < str.length; i += 4) {
    const a = chars.indexOf(str[i]);
    const b = chars.indexOf(str[i + 1]);
    const c = chars.indexOf(str[i + 2]);
    const d = chars.indexOf(str[i + 3]);
    const n = (a << 18) | (b << 12) | (c << 6) | d;
    output += String.fromCharCode((n >> 16) & 0xff);
    if (str[i + 2] !== "=") output += String.fromCharCode((n >> 8) & 0xff);
    if (str[i + 3] !== "=") output += String.fromCharCode(n & 0xff);
  }
  return output;
}

export function useAuth() {
  const {
    login, logout, isAuthenticated, isLoading, user, setLoading,
    biometricEnabled, hasSavedSession, enableBiometric, restoreSession, loginWithBiometric,
  } = useAuthStore();
  const [authError, setAuthError] = useState<string | null>(null);

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: "la.ellipse.tradeshow",
    path: "oauth2redirect",
  });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: CONFIG.MSAL_CLIENT_ID,
      scopes: [...CONFIG.MSAL_SCOPES, "openid", "profile", "email"],
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      prompt: AuthSession.Prompt.SelectAccount,
    },
    discovery
  );

  // Handle OAuth response
  useEffect(() => {
    if (response?.type === "success" && response.params.code) {
      exchangeCodeForToken(response.params.code);
    } else if (response?.type === "error") {
      setAuthError(response.error?.message || "Authentication error");
      setLoading(false);
    } else if (response?.type === "dismiss") {
      setLoading(false);
    }
  }, [response]);

  const exchangeCodeForToken = async (code: string) => {
    try {
      const tokenResult = await AuthSession.exchangeCodeAsync(
        {
          clientId: CONFIG.MSAL_CLIENT_ID,
          code,
          redirectUri,
          extraParams: {
            code_verifier: request?.codeVerifier || "",
          },
        },
        discovery
      );

      if (tokenResult.accessToken) {
        const userInfo = decodeIdToken(tokenResult.idToken || "");
        await login(tokenResult.accessToken, {
          id: userInfo.oid || userInfo.sub || "unknown",
          name: userInfo.name || "Utilisateur",
          email: userInfo.preferred_username || userInfo.email || "",
        });

        // After Microsoft login, offer to enable Face ID (always, in case user wants to activate it)
        promptEnableBiometric();
      } else {
        setAuthError("No token received");
        setLoading(false);
      }
    } catch (error: any) {
      console.error("Token exchange failed:", error);
      setAuthError(error?.message || "Token exchange failed");
      setLoading(false);
    }
  };

  const promptEnableBiometric = () => {
    Alert.alert(
      "Face ID",
      "Would you like to enable Face ID to sign in faster next time?",
      [
        { text: "No thanks", style: "cancel" },
        {
          text: "Enable",
          onPress: async () => {
            await enableBiometric();
          },
        },
      ]
    );
  };

  const decodeIdToken = (token: string): any => {
    try {
      if (!token || !token.includes(".")) return {};
      const payload = token.split(".")[1];
      const decoded = base64Decode(payload);
      return JSON.parse(decoded);
    } catch {
      return {};
    }
  };

  // Full Microsoft sign in
  const signIn = useCallback(async () => {
    try {
      setAuthError(null);
      setLoading(true);
      await promptAsync();
    } catch (error: any) {
      setAuthError(error?.message || "Cannot open sign in");
      setLoading(false);
    }
  }, [promptAsync]);

  // Biometric sign in — uses SecureStore's requireAuthentication to trigger Face ID
  const signInWithBiometric = useCallback(async () => {
    try {
      setAuthError(null);
      setLoading(true);

      const restored = await loginWithBiometric();
      if (!restored) {
        setAuthError("Session expired, please sign in again");
        setLoading(false);
      }
    } catch (error: any) {
      setAuthError(error?.message || "Face ID error");
      setLoading(false);
    }
  }, [loginWithBiometric]);

  const signOut = useCallback(async () => {
    await logout();
  }, [logout]);

  return {
    signIn,
    signInWithBiometric,
    signOut,
    isAuthenticated,
    isLoading,
    user,
    isReady: !!request,
    authError,
    biometricEnabled,
    hasSavedSession,
  };
}
