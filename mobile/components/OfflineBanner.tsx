import { useNetInfo } from "@react-native-community/netinfo";
import { WifiOff } from "lucide-react-native";
import { Text, View } from "react-native";

export function OfflineBanner() {
  const netInfo = useNetInfo();
  if (netInfo.isConnected !== false) return null;
  return (
    <View className="absolute left-0 right-0 top-0 z-50 flex-row items-center justify-center gap-2 bg-red-600 px-4 py-2">
      <WifiOff size={14} color="#ffffff" />
      <Text className="text-xs font-medium text-white">网络已断开，恢复后会自动重连</Text>
    </View>
  );
}
