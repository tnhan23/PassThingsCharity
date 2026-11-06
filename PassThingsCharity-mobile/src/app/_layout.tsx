import {
  BeVietnamPro_400Regular,
  BeVietnamPro_500Medium,
  BeVietnamPro_600SemiBold,
  BeVietnamPro_700Bold,
} from "@expo-google-fonts/be-vietnam-pro";
import { useFonts } from "expo-font";
import { Redirect, Stack, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GuestProvider, useGuest } from "@/api/guest";
import { LocaleProvider } from "@/api/locale";
import { SessionProvider, useSession } from "@/api/session";
import { ShellProvider } from "@/api/shell";
import { colors } from "@/theme";

SplashScreen.preventAutoHideAsync();

function SignedOutGate() {
  const path = usePathname();
  const { ready, user } = useSession();
  const { guest } = useGuest();
  if (!ready || user || guest) return null;
  if (path === "/login") return null;
  return <Redirect href="/login" />;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    BeVietnamPro_400Regular,
    BeVietnamPro_500Medium,
    BeVietnamPro_600SemiBold,
    BeVietnamPro_700Bold,
    LibreBaskerville_Italic: require("../../assets/fonts/LibreBaskerville-Italic.ttf"),
  });

  useEffect(() => {
    if (loaded || error) {
      void SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LocaleProvider>
        <SessionProvider>
          <GuestProvider>
          <ShellProvider>
          <SignedOutGate />
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "none",
              contentStyle: { backgroundColor: colors.surface },
            }}
          >
            <Stack.Screen name="index" options={{ animation: "none" }} />
            <Stack.Screen name="campaign/index" options={{ animation: "none" }} />
            <Stack.Screen name="stations/[mode]" options={{ animation: "none" }} />
            <Stack.Screen name="profile/[mode]" options={{ animation: "none" }} />
            <Stack.Screen name="login" options={{ animation: "none", gestureEnabled: false }} />
          </Stack>
          </ShellProvider>
          </GuestProvider>
        </SessionProvider>
        </LocaleProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
