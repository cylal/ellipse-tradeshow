import { Tabs } from "expo-router";
import { Text } from "react-native";
import { COLORS } from "../../src/constants/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          paddingBottom: 4,
          height: 56,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: COLORS.textInverse,
        headerTitleStyle: { fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Salons",
          tabBarLabel: "Salons",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 22 }}>📅</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="quick-capture"
        options={{
          title: "Capture",
          tabBarLabel: "Capture",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 22 }}>📸</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="sync"
        options={{
          title: "Sync",
          tabBarLabel: "Sync",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 22 }}>🔄</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarLabel: "Profil",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 22 }}>👤</Text>
          ),
        }}
      />
    </Tabs>
  );
}
