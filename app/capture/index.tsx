import { Redirect } from "expo-router";

// Redirect to quick-capture tab, this route is not directly used
export default function CaptureIndex() {
  return <Redirect href="/(tabs)/quick-capture" />;
}
