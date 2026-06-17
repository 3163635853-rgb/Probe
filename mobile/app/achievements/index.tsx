import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { ArrowLeft, Award } from "lucide-react-native";
import { useFetch } from "@/lib/hooks";

interface Achievement {
  code: string;
  name: string;
  description: string;
  icon: string;
  achieved: boolean;
  achieved_at: string | null;
}

export default function AchievementsScreen() {
  const router = useRouter();
  const { data: achievements } = useFetch<Achievement[]>("/achievement/list");

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center px-4 py-3 border-b border-border bg-white">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <ArrowLeft size={20} color="#1c1917" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-base font-semibold text-foreground">
          成就
        </Text>
        <View className="w-7" />
      </View>

      <FlatList
        data={achievements || []}
        keyExtractor={(item) => item.code}
        contentContainerStyle={{ padding: 24, gap: 12 }}
        renderItem={({ item, index }) => (
          <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 250, delay: index * 50 }}
          >
            <View
              className={`flex-row items-center rounded-xl border p-4 ${
                item.achieved ? "border-primary bg-accent" : "border-border bg-white"
              }`}
            >
              <View
                className={`h-10 w-10 items-center justify-center rounded-full ${
                  item.achieved ? "bg-primary" : "bg-muted"
                }`}
              >
                <Award size={18} color={item.achieved ? "#fff" : "#a8a29e"} />
              </View>
              <View className="flex-1 ml-3">
                <Text className={`text-sm font-medium ${item.achieved ? "text-foreground" : "text-muted-foreground"}`}>
                  {item.name}
                </Text>
                <Text className="text-xs text-muted-foreground mt-0.5">
                  {item.description}
                </Text>
              </View>
              {item.achieved && (
                <Text className="text-[10px] text-primary font-medium">已达成</Text>
              )}
            </View>
          </MotiView>
        )}
      />
    </SafeAreaView>
  );
}
