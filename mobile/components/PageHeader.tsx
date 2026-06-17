import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";

interface PageHeaderProps {
  title: string;
  rightAction?: React.ReactNode;
}

export function PageHeader({ title, rightAction }: PageHeaderProps) {
  const router = useRouter();

  return (
    <View className="flex-row items-center px-4 py-3 border-b border-border bg-white">
      <Pressable onPress={() => router.back()} className="p-1">
        <ArrowLeft size={20} color="#1c1917" />
      </Pressable>
      <Text className="flex-1 text-center text-base font-semibold text-foreground">
        {title}
      </Text>
      {rightAction ?? <View className="w-7" />}
    </View>
  );
}
