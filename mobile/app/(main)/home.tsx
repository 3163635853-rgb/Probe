import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";
import { Play, Zap, TrendingUp, ArrowRight, Bell, Sparkles } from "lucide-react-native";
import { useAuth } from "@/lib/auth-context";
import { useFetch } from "@/lib/hooks";
import type { QuotaStatus, PaginatedData, InterviewHistoryItem, InterviewStats } from "@/lib/types";

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: quota } = useFetch<QuotaStatus>("/quota/status");
  const { data: stats } = useFetch<InterviewStats>("/interview/stats?limit=10");
  const { data: unread } = useFetch<{ count: number }>("/notification/unread-count");
  const { data: recent } = useFetch<PaginatedData<InterviewHistoryItem>>(
    "/interview/history?page=1&page_size=3"
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <MotiView
          from={{ opacity: 0, translateY: -10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 500 }}
          className="px-6 pt-6 pb-4"
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm text-muted-foreground">
                {getGreeting()}
              </Text>
              <Text className="text-2xl font-bold text-foreground mt-1">
                {user?.nickname || "面试者"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/notifications")}
              className="relative p-2"
            >
              <Bell size={22} color="#57534e" />
              {unread && unread.count > 0 && (
                <View className="absolute top-1 right-1 h-4 w-4 items-center justify-center rounded-full bg-destructive">
                  <Text className="text-[9px] font-bold text-white">
                    {unread.count > 9 ? "9+" : unread.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </MotiView>

        {/* Hero Card — Start Interview */}
        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 18, delay: 100 }}
          className="mx-6 mb-5"
        >
          <TouchableOpacity
            onPress={() => router.push("/interview/setup")}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={["#f59e0b", "#d97706", "#b45309"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="rounded-2xl p-6"
              style={{
                shadowColor: "#d97706",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 16,
                elevation: 8,
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-white/80 text-sm font-medium">
                    准备好了吗？
                  </Text>
                  <Text className="text-white text-xl font-bold mt-1">
                    开始面试练习
                  </Text>
                  <Text className="text-white/70 text-xs mt-2">
                    AI 驱动的深度追问面试
                  </Text>
                </View>
                <View className="h-14 w-14 items-center justify-center rounded-full bg-white/20">
                  <Play size={24} color="#fff" fill="#fff" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </MotiView>

        {/* Stats Row */}
        <MotiView
          from={{ opacity: 0, translateY: 15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 500, delay: 200 }}
          className="flex-row gap-3 mx-6 mb-5"
        >
          {/* Quota Card */}
          <View className="flex-1 rounded-xl border border-border bg-white p-4">
            <View className="flex-row items-center gap-2 mb-2">
              <Zap size={14} color="#f59e0b" />
              <Text className="text-xs text-muted-foreground">本月配额</Text>
            </View>
            <Text className="text-xl font-bold text-foreground">
              {quota?.quota_remaining ?? "-"}
              <Text className="text-sm font-normal text-muted-foreground">
                {" "}/ {quota?.quota_total ?? "-"}
              </Text>
            </Text>
          </View>

          {/* Score Card */}
          <View className="flex-1 rounded-xl border border-border bg-white p-4">
            <View className="flex-row items-center gap-2 mb-2">
              <TrendingUp size={14} color="#0d9488" />
              <Text className="text-xs text-muted-foreground">均分</Text>
            </View>
            <Text className="text-xl font-bold text-foreground">
              {stats?.avg_score ? Math.round(stats.avg_score) : "--"}
              <Text className="text-sm font-normal text-muted-foreground">
                {" "}/ 100
              </Text>
            </Text>
          </View>
        </MotiView>

        <MotiView
          from={{ opacity: 0, translateY: 14 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 500, delay: 260 }}
          className="mx-6 mb-5"
        >
          <TouchableOpacity onPress={() => router.push("/(main)/growth")} activeOpacity={0.8}>
            <LinearGradient
              colors={["#ecfdf5", "#fffbeb"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="flex-row items-center rounded-2xl border border-emerald-100 p-4"
            >
              <MotiView
                from={{ rotate: "-6deg", scale: 0.95 }}
                animate={{ rotate: "6deg", scale: 1.05 }}
                transition={{ type: "timing", duration: 1000, loop: true }}
                className="h-12 w-12 items-center justify-center rounded-2xl bg-white"
              >
                <Sparkles size={22} color="#0f766e" />
              </MotiView>
              <View className="ml-3 flex-1">
                <Text className="text-sm font-bold text-foreground">成长中心已开启</Text>
                <Text className="mt-1 text-xs text-muted-foreground">等级、连续训练、薄弱项与每日任务</Text>
              </View>
              <ArrowRight size={17} color="#0f766e" />
            </LinearGradient>
          </TouchableOpacity>
        </MotiView>

        {/* Recent Interviews */}
        <MotiView
          from={{ opacity: 0, translateY: 15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 500, delay: 300 }}
          className="mx-6"
        >
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-semibold text-foreground">
              最近练习
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(main)/history")}
              className="flex-row items-center"
            >
              <Text className="text-xs text-primary mr-1">查看全部</Text>
              <ArrowRight size={12} color="#d97706" />
            </TouchableOpacity>
          </View>

          {(!recent || recent.items.length === 0) ? (
            <View className="rounded-xl border border-dashed border-border py-8 items-center">
              <Text className="text-sm text-muted-foreground">
                还没有面试记录
              </Text>
              <Text className="text-xs text-muted-foreground mt-1">
                开始第一次面试练习吧
              </Text>
            </View>
          ) : (
            <View className="gap-2">
              {recent.items.map((item, index) => (
                <MotiView
                  key={item.session_uuid}
                  from={{ opacity: 0, translateX: -10 }}
                  animate={{ opacity: 1, translateX: 0 }}
                  transition={{ type: "timing", duration: 300, delay: 350 + index * 80 }}
                >
                  <TouchableOpacity
                    className="flex-row items-center rounded-xl border border-border bg-white p-4"
                    onPress={
                      item.status === "completed"
                        ? () => router.push(`/interview/${item.session_uuid}/report`)
                        : undefined
                    }
                    disabled={item.status !== "completed"}
                    activeOpacity={item.status === "completed" ? 0.7 : 1}
                  >
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-foreground">
                        {item.position}
                      </Text>
                      <Text className="text-xs text-muted-foreground mt-1">
                        {item.mode} · {item.total_rounds} 题
                      </Text>
                    </View>
                    {item.final_score !== null && (
                      <View className="h-10 w-10 items-center justify-center rounded-full bg-accent">
                        <Text className="text-sm font-bold text-accent-foreground">
                          {item.final_score}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </MotiView>
              ))}
            </View>
          )}
        </MotiView>
      </ScrollView>
    </SafeAreaView>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 6) return "夜深了";
  if (h < 12) return "早上好";
  if (h < 18) return "下午好";
  return "晚上好";
}
