import "../global.css";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { useColorScheme, View, Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineBanner } from "@/components/OfflineBanner";
import { notificationRoute, registerPushToken } from "@/lib/notifications";
import * as Notifications from "expo-notifications";
import { checkActiveInterview, checkAppVersion } from "@/lib/startup";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const startupDone = useRef(false);

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (user && inAuthGroup) {
      router.replace("/(main)/home");
    }
  }, [user, loading, segments, router]);

  // 登录后执行 startup checks（仅一次per session）
  useEffect(() => {
    if (!user) {
      // 登出时重置，下次登录重新执行 startup
      startupDone.current = false;
      return;
    }
    if (!startupDone.current) {
      startupDone.current = true;
      // 冷启动通知优先于活跃面试恢复，避免两个异步跳转互相覆盖。
      (async () => {
        await checkAppVersion();
        void registerPushToken();
        const notificationResponse = await Notifications.getLastNotificationResponseAsync();
        if (notificationResponse) {
          const data = notificationResponse.notification.request.content.data as Record<string, unknown>;
          const target = notificationRoute(data);
          router.push(target as "/" | `/${string}`);
          await Notifications.clearLastNotificationResponseAsync();
          return;
        }
        const activeUuid = await checkActiveInterview();
        if (activeUuid) router.replace(`/interview/${activeUuid}`);
      })();
    }
  }, [user, router]);


  useEffect(() => {
    if (!user) return;
    const navigateFromResponse = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      const target = notificationRoute(data);
      router.push(target as "/" | `/${string}`);
      void Notifications.clearLastNotificationResponseAsync();
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(navigateFromResponse);
    return () => subscription.remove();
  }, [user, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fafaf9", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 28, fontWeight: "bold", color: "#d97706" }}>Probe</Text>
      </View>
    );
  }
  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <AuthProvider>
            <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
            <OfflineBanner />
            <AuthGuard>
              <Slot />
            </AuthGuard>
          </AuthProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
