import { View, Text, ScrollView, TouchableOpacity, Share } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MotiView } from "moti";
import { ArrowLeft, Share2, ThumbsUp, AlertTriangle } from "lucide-react-native";
import { useFetch } from "@/lib/hooks";
import { fetchAPI } from "@/lib/api";
import { useState } from "react";
import { getScoreColorClass } from "@/lib/utils";
import { RadarChart } from "@/components/RadarChart";
import type { InterviewReport } from "@/lib/types";

export default function ReportScreen() {
  const { uuid } = useLocalSearchParams<{ uuid: string }>();
  const router = useRouter();
  const [sharing, setSharing] = useState(false);
  const { data: report, loading } = useFetch<InterviewReport>(
    `/interview/${uuid}/report`
  );

  if (loading || !report) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <MotiView
          from={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
          transition={{ type: "timing", duration: 800, loop: true }}
        >
          <Text className="text-base text-muted-foreground">加载报告中...</Text>
        </MotiView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Score */}
        <LinearGradient
          colors={["#fffbeb", "#fef3c7", "#fafaf9"]}
          className="px-6 pt-4 pb-8"
        >
          {/* Nav */}
          <View className="flex-row items-center justify-between mb-6">
            <TouchableOpacity onPress={() => router.replace("/(main)/home")}>
              <ArrowLeft size={20} color="#1c1917" />
            </TouchableOpacity>
            <TouchableOpacity
              className="h-8 w-8 items-center justify-center rounded-full bg-white border border-border"
              disabled={sharing}
              onPress={async () => {
                if (!report || sharing) return;
                setSharing(true);
                try {
                  const generated = await fetchAPI<{ image_url: string; share_id: number }>(
                    "/share/generate-image",
                    {
                      method: "POST",
                      body: JSON.stringify({ session_uuid: uuid, template: "radar" }),
                    }
                  );
                  const result = await Share.share({
                    message: `我在 Probe 完成了一次${report.position}模拟面试，得分 ${report.overall_score} 分！${generated.image_url}`,
                    url: generated.image_url,
                  });
                  if (result.action === Share.sharedAction) {
                    await fetchAPI("/share/record", {
                      method: "POST",
                      body: JSON.stringify({ share_id: generated.share_id, channel: "link" }),
                    });
                  }
                } finally {
                  setSharing(false);
                }
              }}
            >
              <Share2 size={14} color="#78716c" />
            </TouchableOpacity>
          </View>

          {/* Score */}
          <MotiView
            from={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", damping: 12, delay: 200 }}
            className="items-center"
          >
            <Text className="text-6xl font-bold text-primary">
              {report.overall_score}
            </Text>
            <Text className="text-sm text-muted-foreground mt-1">综合评分</Text>
            <View className="flex-row items-center gap-2 mt-3">
              <View className="rounded-full bg-white/80 px-3 py-1">
                <Text className="text-xs text-muted-foreground">
                  {report.position}
                </Text>
              </View>
              <View className="rounded-full bg-white/80 px-3 py-1">
                <Text className="text-xs text-muted-foreground">
                  {report.mode}
                </Text>
              </View>
              <View className="rounded-full bg-white/80 px-3 py-1">
                <Text className="text-xs text-muted-foreground">
                  {report.total_rounds} 题
                </Text>
              </View>
            </View>
          </MotiView>
        </LinearGradient>

        {/* Radar Chart */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 500, delay: 300 }}
          className="mx-6 -mt-2 mb-4"
        >
          <RadarChart dimensions={report.dimensions} />
        </MotiView>

        {/* Summary */}
        <MotiView
          from={{ opacity: 0, translateY: 15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 500, delay: 400 }}
          className="mx-6 mb-4"
        >
          <View className="rounded-xl border border-border bg-white p-5">
            <Text className="text-sm font-semibold text-foreground mb-2">
              总体评价
            </Text>
            <Text className="text-sm leading-6 text-muted-foreground">
              {report.summary}
            </Text>
          </View>
        </MotiView>

        {/* Strengths & Improvements */}
        <MotiView
          from={{ opacity: 0, translateY: 15 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 500, delay: 500 }}
          className="flex-row gap-3 mx-6 mb-4"
        >
          <View className="flex-1 rounded-xl border border-border bg-white p-4">
            <View className="flex-row items-center gap-2 mb-3">
              <ThumbsUp size={14} color="#0d9488" />
              <Text className="text-xs font-semibold text-success">优势</Text>
            </View>
            {report.strengths.map((s, i) => (
              <Text key={i} className="text-xs leading-5 text-muted-foreground mb-1.5">
                • {s}
              </Text>
            ))}
          </View>
          <View className="flex-1 rounded-xl border border-border bg-white p-4">
            <View className="flex-row items-center gap-2 mb-3">
              <AlertTriangle size={14} color="#dc2626" />
              <Text className="text-xs font-semibold text-destructive">改进</Text>
            </View>
            {report.improvements.map((s, i) => (
              <Text key={i} className="text-xs leading-5 text-muted-foreground mb-1.5">
                • {s}
              </Text>
            ))}
          </View>
        </MotiView>

        {/* Round Details */}
        <View className="mx-6">
          <Text className="text-base font-semibold text-foreground mb-3">
            逐题回顾
          </Text>
          {report.rounds.map((r, index) => (
            <MotiView
              key={r.round}
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 300, delay: 600 + index * 80 }}
            >
              <View className="mb-3 rounded-xl border border-border bg-white p-4">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center gap-2">
                    <View className="h-6 w-6 items-center justify-center rounded-full bg-muted">
                      <Text className="text-[10px] font-bold text-muted-foreground">
                        {r.round}
                      </Text>
                    </View>
                    <Text className="text-xs text-muted-foreground">
                      第 {r.round} 题
                    </Text>
                  </View>
                  <View className={`rounded-full px-2.5 py-0.5 ${getScoreColorClass(r.score)}`}>
                    <Text className="text-xs font-bold text-white">
                      {r.score}
                    </Text>
                  </View>
                </View>
                <Text className="text-sm font-medium text-foreground mb-2">
                  {r.question}
                </Text>
                <Text className="text-xs leading-5 text-muted-foreground">
                  {r.answer}
                </Text>
              </View>
            </MotiView>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
