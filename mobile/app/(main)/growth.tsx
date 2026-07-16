import { useCallback, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { AnimatePresence, MotiView } from "moti";
import * as Haptics from "expo-haptics";
import * as Burnt from "burnt";
import {
  BarChart3,
  Brain,
  CheckCircle2,
  ChevronRight,
  Flame,
  Lock,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from "lucide-react-native";

import { fetchAPI } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import type { GrowthOverview, GrowthTask } from "@/lib/types";

const GOAL_OPTIONS = [3, 5, 7];

export default function GrowthScreen() {
  const router = useRouter();
  const { data, loading, refetch } = useFetch<GrowthOverview>("/growth/overview");
  const [refreshing, setRefreshing] = useState(false);
  const [completingId, setCompletingId] = useState<number | null>(null);
  const [updatingGoal, setUpdatingGoal] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );

  const completedRatio = useMemo(() => {
    if (!data?.daily_total) return 0;
    return data.daily_completed / data.daily_total;
  }, [data]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }

  async function completeTask(task: GrowthTask) {
    if (task.status === "completed" || completingId !== null) return;
    if (task.task_type === "interview") {
      router.push("/interview/setup");
      return;
    }
    setCompletingId(task.id);
    try {
      await fetchAPI(`/growth/tasks/${task.id}/complete`, { method: "POST" });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Burnt.toast({ title: `任务完成 · +${task.xp_reward} XP`, preset: "done", haptic: "success" });
      await refetch();
    } catch (error: unknown) {
      Burnt.toast({
        title: "任务暂未完成",
        message: error instanceof Error ? error.message : "请稍后重试",
        preset: "error",
        haptic: "error",
      });
    } finally {
      setCompletingId(null);
    }
  }

  async function updateGoal(goal: number) {
    if (updatingGoal !== null || goal === data?.profile.weekly_goal) return;
    setUpdatingGoal(goal);
    try {
      await fetchAPI("/growth/weekly-goal", {
        method: "PUT",
        body: JSON.stringify({ weekly_goal: goal }),
      });
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Burnt.toast({ title: `每周目标已调整为 ${goal} 次`, preset: "done" });
      await refetch();
    } catch (error: unknown) {
      Burnt.toast({
        title: "目标更新失败",
        message: error instanceof Error ? error.message : "请稍后重试",
        preset: "error",
      });
    } finally {
      setUpdatingGoal(null);
    }
  }

  if (loading && !data) {
    return <GrowthLoading />;
  }

  if (!data) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background px-8">
        <Brain size={36} color="#d97706" />
        <Text className="mt-4 text-base font-semibold text-foreground">成长数据暂时不可用</Text>
        <TouchableOpacity onPress={refetch} className="mt-5 rounded-full bg-primary px-6 py-3">
          <Text className="font-semibold text-white">重新加载</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d97706" />
        }
      >
        <View className="flex-row items-center justify-between px-6 pb-4 pt-5">
          <View>
            <Text className="text-xs font-semibold uppercase tracking-[2px] text-primary">Growth Lab</Text>
            <Text className="mt-1 text-3xl font-bold text-foreground">成长中心</Text>
          </View>
          <MotiView
            from={{ rotate: "-8deg", scale: 0.92 }}
            animate={{ rotate: "8deg", scale: 1.05 }}
            transition={{ type: "timing", duration: 1100, loop: true }}
            className="h-11 w-11 items-center justify-center rounded-2xl bg-accent"
          >
            <Sparkles size={21} color="#d97706" />
          </MotiView>
        </View>

        <LevelHero overview={data} completedRatio={completedRatio} />
        <MomentumCards overview={data} />
        <WeeklyActivity overview={data} />
        <FocusDimensions overview={data} />

        <View className="mx-6 mt-7">
          <View className="mb-4 flex-row items-end justify-between">
            <View>
              <Text className="text-lg font-bold text-foreground">今日任务</Text>
              <Text className="mt-1 text-xs text-muted-foreground">
                {data.daily_completed}/{data.daily_total} 已完成 · 全部完成可获得每日成长闭环
              </Text>
            </View>
            <View className="rounded-full bg-accent px-3 py-1.5">
              <Text className="text-xs font-bold text-accent-foreground">
                +{data.daily_tasks.reduce((sum, task) => sum + task.xp_reward, 0)} XP
              </Text>
            </View>
          </View>

          <View className="gap-3">
            <AnimatePresence>
              {data.daily_tasks.map((task, index) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={index}
                  loading={completingId === task.id}
                  onPress={() => completeTask(task)}
                />
              ))}
            </AnimatePresence>
          </View>
        </View>

        <View className="mx-6 mt-7 rounded-2xl border border-border bg-white p-5">
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-secondary">
              <Target size={19} color="#57534e" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-foreground">每周训练目标</Text>
              <Text className="mt-0.5 text-xs text-muted-foreground">选择一个有压力但能完成的节奏</Text>
            </View>
          </View>
          <View className="mt-4 flex-row gap-2">
            {GOAL_OPTIONS.map((goal) => {
              const active = data.profile.weekly_goal === goal;
              return (
                <TouchableOpacity
                  key={goal}
                  onPress={() => updateGoal(goal)}
                  disabled={updatingGoal !== null}
                  className={`flex-1 items-center rounded-xl border py-3 ${
                    active ? "border-primary bg-primary" : "border-border bg-background"
                  }`}
                >
                  <Text className={`text-base font-bold ${active ? "text-white" : "text-foreground"}`}>
                    {goal}
                  </Text>
                  <Text className={`text-[10px] ${active ? "text-white/75" : "text-muted-foreground"}`}>
                    次 / 周
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function LevelHero({ overview, completedRatio }: { overview: GrowthOverview; completedRatio: number }) {
  const profile = overview.profile;
  return (
    <MotiView
      from={{ opacity: 0, translateY: 18, scale: 0.97 }}
      animate={{ opacity: 1, translateY: 0, scale: 1 }}
      transition={{ type: "spring", damping: 17 }}
      className="mx-6"
    >
      <LinearGradient
        colors={["#1c1917", "#292524", "#78350f"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="overflow-hidden rounded-[28px] p-6"
        style={{ shadowColor: "#1c1917", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.24, shadowRadius: 20, elevation: 10 }}
      >
        <MotiView
          from={{ rotate: "0deg", scale: 0.9 }}
          animate={{ rotate: "360deg", scale: 1.08 }}
          transition={{ type: "timing", duration: 14000, loop: true }}
          className="absolute -right-14 -top-14 h-52 w-52 rounded-full border border-white/10"
        >
          <View className="absolute left-1/2 top-0 h-3 w-3 rounded-full bg-primary" />
          <View className="absolute bottom-5 left-5 h-2 w-2 rounded-full bg-success" />
        </MotiView>
        <View className="absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-primary/10" />

        <View className="flex-row items-center justify-between">
          <View className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5">
            <Text className="text-xs font-semibold text-white/80">LEVEL {profile.level}</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <Zap size={14} color="#fbbf24" fill="#fbbf24" />
            <Text className="text-sm font-bold text-amber-300">{profile.xp} XP</Text>
          </View>
        </View>

        <View className="mt-8 flex-row items-end justify-between">
          <View>
            <Text className="text-sm text-white/55">当前称号</Text>
            <Text className="mt-1 text-4xl font-bold text-white">{profile.title}</Text>
          </View>
          <MotiView
            from={{ translateY: 0 }}
            animate={{ translateY: -6 }}
            transition={{ type: "timing", duration: 1200, loop: true }}
            className="h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/10"
          >
            <Trophy size={30} color="#fbbf24" />
          </MotiView>
        </View>

        <View className="mt-7">
          <View className="mb-2 flex-row justify-between">
            <Text className="text-xs text-white/55">距离下一等级</Text>
            <Text className="text-xs font-semibold text-white/80">
              {profile.level_xp} / {profile.next_level_xp}
            </Text>
          </View>
          <View className="h-2 overflow-hidden rounded-full bg-white/10">
            <MotiView
              from={{ width: "0%" }}
              animate={{ width: `${profile.progress_percent}%` }}
              transition={{ type: "timing", duration: 1100, delay: 250 }}
              className="h-full rounded-full bg-amber-400"
            />
          </View>
        </View>

        <View className="mt-5 flex-row items-center justify-between rounded-2xl bg-black/15 p-4">
          <View>
            <Text className="text-xs text-white/50">今日闭环</Text>
            <Text className="mt-1 text-lg font-bold text-white">
              {overview.daily_completed}/{overview.daily_total} 任务
            </Text>
          </View>
          <View className="h-10 w-px bg-white/10" />
          <View className="items-end">
            <Text className="text-xs text-white/50">完成率</Text>
            <Text className="mt-1 text-lg font-bold text-emerald-300">
              {Math.round(completedRatio * 100)}%
            </Text>
          </View>
        </View>
      </LinearGradient>
    </MotiView>
  );
}

function MomentumCards({ overview }: { overview: GrowthOverview }) {
  const profile = overview.profile;
  return (
    <View className="mx-6 mt-4 flex-row gap-3">
      <MotiView
        from={{ opacity: 0, translateX: -12 }}
        animate={{ opacity: 1, translateX: 0 }}
        transition={{ type: "timing", duration: 500, delay: 120 }}
        className="flex-1 rounded-2xl border border-orange-200 bg-orange-50 p-4"
      >
        <View className="flex-row items-center justify-between">
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-orange-100">
            <Flame size={18} color="#ea580c" fill="#fb923c" />
          </View>
          <Text className="text-[10px] font-semibold uppercase tracking-wider text-orange-700">Streak</Text>
        </View>
        <Text className="mt-4 text-3xl font-bold text-orange-950">{profile.current_streak}</Text>
        <Text className="mt-1 text-xs text-orange-700">连续训练天数</Text>
        <Text className="mt-3 text-[10px] text-orange-600/75">历史最长 {profile.longest_streak} 天</Text>
      </MotiView>

      <MotiView
        from={{ opacity: 0, translateX: 12 }}
        animate={{ opacity: 1, translateX: 0 }}
        transition={{ type: "timing", duration: 500, delay: 180 }}
        className="flex-1 rounded-2xl border border-teal-200 bg-teal-50 p-4"
      >
        <View className="flex-row items-center justify-between">
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-teal-100">
            <Target size={18} color="#0f766e" />
          </View>
          <Text className="text-[10px] font-semibold uppercase tracking-wider text-teal-700">Weekly</Text>
        </View>
        <Text className="mt-4 text-3xl font-bold text-teal-950">
          {profile.weekly_completed}/{profile.weekly_goal}
        </Text>
        <Text className="mt-1 text-xs text-teal-700">本周训练目标</Text>
        <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-teal-100">
          <MotiView
            from={{ width: "0%" }}
            animate={{ width: `${profile.weekly_progress_percent}%` }}
            transition={{ type: "timing", duration: 900, delay: 300 }}
            className="h-full rounded-full bg-success"
          />
        </View>
      </MotiView>
    </View>
  );
}

function WeeklyActivity({ overview }: { overview: GrowthOverview }) {
  const maxCount = Math.max(1, ...overview.weekly_activity.map((day) => day.count));
  return (
    <MotiView
      from={{ opacity: 0, translateY: 14 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 500, delay: 240 }}
      className="mx-6 mt-7 rounded-2xl border border-border bg-white p-5"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <BarChart3 size={18} color="#d97706" />
          <Text className="text-base font-bold text-foreground">七日训练脉冲</Text>
        </View>
        <Text className="text-xs text-muted-foreground">面试次数</Text>
      </View>
      <View className="mt-6 h-32 flex-row items-end justify-between gap-2">
        {overview.weekly_activity.map((day, index) => {
          const barHeight = day.count ? 28 + (day.count / maxCount) * 70 : 10;
          return (
            <View key={day.date} className="flex-1 items-center">
              {day.avg_score > 0 ? (
                <Text className="mb-1 text-[9px] font-semibold text-muted-foreground">{day.avg_score}</Text>
              ) : null}
              <MotiView
                from={{ height: 6, opacity: 0.35 }}
                animate={{ height: barHeight, opacity: 1 }}
                transition={{ type: "timing", duration: 650, delay: 320 + index * 70 }}
                className={`w-full max-w-7 rounded-t-lg ${day.is_today ? "bg-primary" : day.count ? "bg-amber-300" : "bg-secondary"}`}
              />
              <Text className={`mt-2 text-[10px] ${day.is_today ? "font-bold text-primary" : "text-muted-foreground"}`}>
                {day.weekday}
              </Text>
            </View>
          );
        })}
      </View>
    </MotiView>
  );
}

function FocusDimensions({ overview }: { overview: GrowthOverview }) {
  return (
    <View className="mt-7">
      <View className="mb-3 flex-row items-center justify-between px-6">
        <View>
          <Text className="text-lg font-bold text-foreground">能力聚焦</Text>
          <Text className="mt-1 text-xs text-muted-foreground">从最需要突破的维度开始</Text>
        </View>
        <Brain size={20} color="#0f766e" />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}>
        {overview.focus_dimensions.map((dimension, index) => (
          <MotiView
            key={dimension.name}
            from={{ opacity: 0, translateX: 18 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ type: "timing", duration: 450, delay: 300 + index * 90 }}
            className="w-48 rounded-2xl border border-border bg-white p-4"
          >
            <View className="flex-row items-start justify-between">
              <View className={`h-9 w-9 items-center justify-center rounded-xl ${index === 0 ? "bg-red-50" : "bg-secondary"}`}>
                {index === 0 ? <Zap size={17} color="#dc2626" /> : <Brain size={17} color="#57534e" />}
              </View>
              <Text className={`text-2xl font-bold ${dimension.score >= 80 ? "text-success" : dimension.score >= 65 ? "text-primary" : "text-destructive"}`}>
                {dimension.score || "--"}
              </Text>
            </View>
            <Text className="mt-5 text-sm font-semibold text-foreground">{dimension.name}</Text>
            <Text className="mt-1 text-xs text-muted-foreground">{dimension.status}</Text>
            <View className="mt-4 h-1.5 overflow-hidden rounded-full bg-secondary">
              <MotiView
                from={{ width: "0%" }}
                animate={{ width: `${dimension.score}%` }}
                transition={{ type: "timing", duration: 850, delay: 420 + index * 90 }}
                className={`h-full rounded-full ${dimension.score >= 80 ? "bg-success" : dimension.score >= 65 ? "bg-primary" : "bg-destructive"}`}
              />
            </View>
          </MotiView>
        ))}
      </ScrollView>
    </View>
  );
}

function TaskCard({
  task,
  index,
  loading,
  onPress,
}: {
  task: GrowthTask;
  index: number;
  loading: boolean;
  onPress: () => void;
}) {
  const completed = task.status === "completed";
  const Icon = task.task_type === "interview" ? Trophy : task.task_type === "focus" ? Zap : Brain;
  return (
    <MotiView
      from={{ opacity: 0, translateY: 14, scale: 0.98 }}
      animate={{ opacity: 1, translateY: 0, scale: 1 }}
      exit={{ opacity: 0, translateX: 40 }}
      transition={{ type: "spring", damping: 18, delay: index * 80 }}
    >
      <TouchableOpacity
        onPress={onPress}
        disabled={completed || loading}
        activeOpacity={0.78}
        className={`flex-row items-center rounded-2xl border p-4 ${
          completed ? "border-teal-200 bg-teal-50" : "border-border bg-white"
        }`}
      >
        <MotiView
          animate={completed ? { scale: [1, 1.15, 1] } : { scale: 1 }}
          transition={{ type: "timing", duration: 500 }}
          className={`h-12 w-12 items-center justify-center rounded-2xl ${completed ? "bg-teal-100" : "bg-accent"}`}
        >
          {completed ? <CheckCircle2 size={23} color="#0f766e" /> : <Icon size={22} color="#d97706" />}
        </MotiView>
        <View className="ml-3 flex-1">
          <View className="flex-row items-center gap-2">
            <Text className={`flex-1 text-sm font-semibold ${completed ? "text-teal-950" : "text-foreground"}`}>
              {task.title}
            </Text>
            <Text className={`text-xs font-bold ${completed ? "text-teal-700" : "text-primary"}`}>
              +{task.xp_reward} XP
            </Text>
          </View>
          <Text className={`mt-1 text-xs ${completed ? "text-teal-700" : "text-muted-foreground"}`}>
            {completed ? "已完成 · XP 已入账" : task.description}
          </Text>
          {!completed && task.task_type === "interview" ? (
            <View className="mt-2 flex-row items-center gap-1">
              <Lock size={10} color="#a8a29e" />
              <Text className="text-[10px] text-muted-foreground">完成面试后自动领取</Text>
            </View>
          ) : null}
        </View>
        {!completed ? <ChevronRight size={18} color="#a8a29e" /> : null}
      </TouchableOpacity>
    </MotiView>
  );
}

function GrowthLoading() {
  return (
    <SafeAreaView className="flex-1 bg-background px-6 pt-6">
      <MotiView
        from={{ opacity: 0.35 }}
        animate={{ opacity: 0.8 }}
        transition={{ type: "timing", duration: 800, loop: true }}
        className="h-9 w-40 rounded-xl bg-muted"
      />
      <MotiView
        from={{ opacity: 0.35 }}
        animate={{ opacity: 0.8 }}
        transition={{ type: "timing", duration: 850, loop: true }}
        className="mt-6 h-72 rounded-[28px] bg-stone-200"
      />
      <View className="mt-4 flex-row gap-3">
        <View className="h-36 flex-1 rounded-2xl bg-orange-100" />
        <View className="h-36 flex-1 rounded-2xl bg-teal-100" />
      </View>
    </SafeAreaView>
  );
}
