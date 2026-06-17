import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MotiView } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import {
  Crown,
  Bell,
  Gift,
  HelpCircle,
  LogOut,
  ChevronRight,
} from "lucide-react-native";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "expo-router";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.replace("/(auth)/login");
  }

  const menuItems = [
    { icon: Crown, label: "会员中心", color: "#f59e0b", onPress: () => {} },
    { icon: Bell, label: "通知", color: "#6366f1", onPress: () => router.push("/notifications") },
    { icon: Gift, label: "邀请奖励", color: "#ec4899", onPress: () => {} },
    { icon: HelpCircle, label: "帮助与反馈", color: "#0d9488", onPress: () => router.push("/feedback") },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <MotiView
          from={{ opacity: 0, translateY: -10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 500 }}
          className="items-center pt-8 pb-6"
        >
          <LinearGradient
            colors={["#f59e0b", "#d97706"]}
            className="h-20 w-20 items-center justify-center rounded-full"
            style={{
              shadowColor: "#d97706",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 6,
            }}
          >
            <Text className="text-3xl font-bold text-white">
              {user?.nickname?.[0] || "U"}
            </Text>
          </LinearGradient>
          <Text className="mt-4 text-xl font-bold text-foreground">
            {user?.nickname || "用户"}
          </Text>
          <View className="mt-2 flex-row items-center gap-1.5 rounded-full bg-accent px-3 py-1">
            <Crown size={12} color="#92400e" />
            <Text className="text-xs font-medium text-accent-foreground">
              {user?.membership_type === "free"
                ? "免费版"
                : user?.membership_type === "monthly"
                  ? "月度会员"
                  : "年度会员"}
            </Text>
          </View>
        </MotiView>

        {/* Menu List */}
        <MotiView
          from={{ opacity: 0, translateY: 15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 500, delay: 150 }}
          className="mx-6 rounded-xl border border-border bg-white overflow-hidden"
        >
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.label}
              className={`flex-row items-center px-4 py-4 ${
                index < menuItems.length - 1 ? "border-b border-border" : ""
              }`}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View
                className="h-8 w-8 items-center justify-center rounded-lg"
                style={{ backgroundColor: item.color + "15" }}
              >
                <item.icon size={16} color={item.color} />
              </View>
              <Text className="flex-1 ml-3 text-sm font-medium text-foreground">
                {item.label}
              </Text>
              <ChevronRight size={16} color="#a8a29e" />
            </TouchableOpacity>
          ))}
        </MotiView>

        {/* Logout */}
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: "timing", duration: 500, delay: 300 }}
          className="mx-6 mt-6"
        >
          <TouchableOpacity
            className="flex-row items-center justify-center gap-2 h-12 rounded-xl border border-border bg-white"
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <LogOut size={16} color="#dc2626" />
            <Text className="text-sm font-medium text-destructive">
              退出登录
            </Text>
          </TouchableOpacity>
        </MotiView>
      </ScrollView>
    </SafeAreaView>
  );
}
