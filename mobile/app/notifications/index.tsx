import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { ArrowLeft, Bell, CheckCheck } from "lucide-react-native";
import { useFetch } from "@/lib/hooks";
import { fetchAPI } from "@/lib/api";
import { formatRelativeTime } from "@/lib/utils";
import type { PaginatedData } from "@/lib/types";

interface Notification {
  id: number;
  title: string;
  content: string;
  type: string;
  is_read: boolean;
  created_at: string;
  data?: Record<string, string>;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { data, loading, refetch } = useFetch<PaginatedData<Notification>>(
    "/notification/list?page=1&page_size=50"
  );
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  async function markAllRead() {
    try {
      await fetchAPI("/notification/read-all", { method: "PUT" });
      refetch();
    } catch {}
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border bg-white">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <ArrowLeft size={20} color="#1c1917" />
        </TouchableOpacity>
        <Text className="text-base font-semibold text-foreground">通知</Text>
        <TouchableOpacity onPress={markAllRead} className="p-1">
          <CheckCheck size={18} color="#78716c" />
        </TouchableOpacity>
      </View>

      {!loading && (!data || data.items.length === 0) ? (
        <View className="flex-1 items-center justify-center">
          <Bell size={32} color="#d6d3d1" />
          <Text className="mt-3 text-sm text-muted-foreground">暂无通知</Text>
        </View>
      ) : (
        <FlatList
          data={data?.items || []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingVertical: 8 }}
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
              from={{ opacity: 0, translateX: -8 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{ type: "timing", duration: 250, delay: index * 40 }}
            >
              <TouchableOpacity
                className={`px-5 py-4 border-b border-border ${
                  !item.is_read ? "bg-accent" : "bg-white"
                }`}
                onPress={async () => {
                  if (!item.is_read) {
                    await fetchAPI(`/notification/${item.id}/read`, { method: "PUT" });
                  }
                  // 白名单校验通知跳转路径
                  const allowedPrefixes = ["/(main)/", "/interview/"];
                  if (
                    item.data?.screen &&
                    allowedPrefixes.some((p) => item.data!.screen.startsWith(p))
                  ) {
                    router.push(item.data.screen as "/" | `/${string}`);
                  }
                }}
                activeOpacity={0.7}
              >
                <View className="flex-row items-start gap-3">
                  {!item.is_read && (
                    <View className="h-2 w-2 rounded-full bg-primary mt-2" />
                  )}
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-foreground">
                      {item.title}
                    </Text>
                    <Text className="text-xs text-muted-foreground mt-1 leading-4">
                      {item.content}
                    </Text>
                    <Text className="text-[10px] text-muted-foreground mt-2">
                      {formatRelativeTime(item.created_at)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </MotiView>
          )}
        />
      )}
    </SafeAreaView>
  );
}
