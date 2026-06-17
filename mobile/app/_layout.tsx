import "../global.css";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import { useColorScheme, View, Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { registerPushToken } from "@/lib/notifications";
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
      // 按顺序执行：版本检查优先（可能阻断），然后检查活跃面试
      (async () => {
        await checkAppVersion(); // 如果需要强制更新，Alert 会阻断后续
        registerPushToken();
        const activeUuid = await checkActiveInterview();
        if (activeUuid) router.replace(`/interview/${activeUuid}`);
      })();
    }
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
            <AuthGuard>
              <Slot />
            </AuthGuard>
          </AuthProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
