import { View, Text, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MotiView } from "moti";
import { SkeletonList } from "@/components/Skeleton";
import { FileText, Clock, ChevronRight } from "lucide-react-native";
import { useFetch } from "@/lib/hooks";
import { useRefresh } from "@/lib/useRefresh";
import { formatRelativeDate, getScoreColorClass } from "@/lib/utils";
import type { InterviewHistoryItem, PaginatedData } from "@/lib/types";

export default function HistoryScreen() {
  const router = useRouter();
  const { data, loading, refetch } = useFetch<PaginatedData<InterviewHistoryItem>>(
    "/interview/history?page=1&page_size=50"
  );
  const { refreshing, onRefresh } = useRefresh(refetch);
  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-6 pt-6 pb-4">
        <Text className="text-2xl font-bold text-foreground">面试记录</Text>
        {data && data.total > 0 && (
          <Text className="text-sm text-muted-foreground mt-1">
            共 {data.total} 次练习
          </Text>
        )}
      </View>

      {loading ? (
        <SkeletonList count={4} />
      ) : !data || data.items.length === 0 ? (
        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 15 }}
          className="flex-1 items-center justify-center px-8"
        >
          <View className="h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <FileText size={28} color="#a8a29e" />
          </View>
          <Text className="text-base font-medium text-foreground">
            暂无面试记录
          </Text>
          <Text className="text-sm text-muted-foreground mt-2 text-center">
            完成一次面试练习后{"\n"}记录会出现在这里
          </Text>
        </MotiView>
      ) : (
        <FlatList
          data={data?.items || []}
          keyExtractor={(item) => item.session_uuid}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#d97706"
              colors={["#d97706"]}
            />
          }
          renderItem={({ item, index }) => (
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 300, delay: index * 60 }}
            >
              <TouchableOpacity
                className="mb-3 rounded-xl border border-border bg-white p-4 active:scale-[0.98]"
                onPress={
                  item.status === "completed"
                    ? () => router.push(`/interview/${item.session_uuid}/report`)
                    : undefined
                }
                disabled={item.status !== "completed"}
                activeOpacity={item.status === "completed" ? 0.8 : 1}
              >
                <View className="flex-row items-center">
                  {/* Score Badge */}
                  <View
                    className={`h-11 w-11 items-center justify-center rounded-xl ${getScoreColorClass(item.final_score)}`}
                  >
                    <Text className="text-sm font-bold text-white">
                      {item.final_score ?? "--"}
                    </Text>
                  </View>

                  {/* Info */}
                  <View className="flex-1 ml-3">
                    <Text className="text-sm font-semibold text-foreground">
                      {item.position}
                    </Text>
                    <View className="flex-row items-center mt-1 gap-2">
                      <Text className="text-xs text-muted-foreground">
                        {item.mode}
                      </Text>
                      <View className="h-1 w-1 rounded-full bg-border" />
                      <Text className="text-xs text-muted-foreground">
                        {item.total_rounds} 题
                      </Text>
                      <View className="h-1 w-1 rounded-full bg-border" />
                      <View className="flex-row items-center gap-0.5">
                        <Clock size={10} color="#a8a29e" />
                        <Text className="text-xs text-muted-foreground">
                          {formatRelativeDate(item.started_at)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Arrow */}
                  {item.status === "completed" && (
                    <ChevronRight size={16} color="#a8a29e" />
                  )}
                </View>
              </TouchableOpacity>
            </MotiView>
          )}
        />
      )}
    </SafeAreaView>
  );
}
