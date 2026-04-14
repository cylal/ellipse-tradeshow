import { Stack, useRouter } from "expo-router";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../src/constants/theme";

export default function MeetingsLayout() {
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: COLORS.textInverse,
        headerTitleStyle: { fontWeight: "600" },
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Meetings",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.replace("/(tabs)")}
              style={{ marginRight: 8, padding: 4 }}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.textInverse} />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="new"
        options={{ title: "New Meeting", presentation: "modal" }}
      />
    </Stack>
  );
}
