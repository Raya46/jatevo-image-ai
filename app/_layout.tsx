import { Stack } from "expo-router";
import { AppProvider } from "../contexts/AppContext";
import "../globals.css";

export default function RootLayout() {
  return (
    <AppProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AppProvider>
  );
}
