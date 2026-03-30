import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { COLORS } from "../src/constants/theme";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.primary },
          headerTintColor: COLORS.textInverse,
          headerTitleStyle: { fontWeight: "600" },
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="event/[id]"
          options={{ title: "Détail Salon" }}
        />
        <Stack.Screen
          name="event/new"
          options={{ title: "Nouveau Salon", presentation: "modal" }}
        />
        <Stack.Screen
          name="encounter/[id]"
          options={{ title: "Détail Rencontre" }}
        />
        <Stack.Screen
          name="capture/index"
          options={{
            title: "Capture Rapide",
            presentation: "fullScreenModal",
            headerStyle: { backgroundColor: COLORS.primary },
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
            title: "Enregistrement Audio",
            presentation: "fullScreenModal",
          }}
        />
      </Stack>
    </>
  );
}
