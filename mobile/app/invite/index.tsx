import { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, Share } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { ArrowLeft, Gift, Copy, Users } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useFetch } from "@/lib/hooks";
import { fetchAPI } from "@/lib/api";

interface InviteInfo {
  code: string;
  reward_description: string;
  total_invited: number;
  total_reward: number;
}

export default function InviteScreen() {
  const router = useRouter();
  const { data: invite } = useFetch<InviteInfo>("/invite/my-code");
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemResult, setRedeemResult] = useState("");
  const [redeemError, setRedeemError] = useState("");

  async function handleShare() {
    if (!invite) return;
    await Share.share({
      message: `我在用 Probe AI面试训练，邀请你一起练习！输入我的邀请码 ${invite.code} 即可获得额外面试次数 👉 https://probe.app`,
    });
  }

  async function handleRedeem() {
    if (!redeemCode.trim()) return;
    setRedeemError("");
    setRedeemResult("");
    try {
      const res = await fetchAPI<{ reward: string }>("/invite/redeem", {
        method: "POST",
        body: JSON.stringify({ code: redeemCode.trim() }),
      });
      setRedeemResult(res.reward);
      setRedeemCode("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      setRedeemError(e instanceof Error ? e.message : "兑换失败");
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-border bg-white">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <ArrowLeft size={20} color="#1c1917" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-base font-semibold text-foreground">
          邀请奖励
        </Text>
        <View className="w-7" />
      </View>

      <View className="flex-1 px-6 pt-6">
        {/* My Code */}
        {invite && (
          <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", damping: 15 }}
            className="rounded-xl border border-border bg-white p-6 items-center"
          >
            <Gift size={28} color="#d97706" />
            <Text className="mt-3 text-sm text-muted-foreground">
              我的邀请码
            </Text>
            <Text className="mt-2 text-2xl font-bold text-foreground tracking-widest">
              {invite.code}
            </Text>
            <Text className="mt-2 text-xs text-muted-foreground text-center">
              {invite.reward_description}
            </Text>

            <View className="flex-row items-center gap-3 mt-4">
              <View className="items-center">
                <Text className="text-lg font-bold text-primary">{invite.total_invited}</Text>
                <Text className="text-xs text-muted-foreground">已邀请</Text>
              </View>
              <View className="h-6 w-px bg-border" />
              <View className="items-center">
                <Text className="text-lg font-bold text-primary">+{invite.total_reward}</Text>
                <Text className="text-xs text-muted-foreground">获得次数</Text>
              </View>
            </View>

            <TouchableOpacity
              className="mt-5 h-11 w-full items-center justify-center rounded-xl bg-primary"
              onPress={handleShare}
              activeOpacity={0.85}
            >
              <Text className="text-sm font-semibold text-white">分享给好友</Text>
            </TouchableOpacity>
          </MotiView>
        )}

        {/* Redeem */}
        <View className="mt-6">
          <Text className="text-sm font-semibold text-foreground mb-3">
            兑换邀请码
          </Text>
          <View className="flex-row gap-2">
            <TextInput
              className="flex-1 h-11 rounded-xl border border-input bg-white px-4 text-base text-foreground"
              placeholder="输入邀请码"
              placeholderTextColor="#a8a29e"
              value={redeemCode}
              onChangeText={setRedeemCode}
              autoCapitalize="characters"
              maxLength={20}
            />
            <TouchableOpacity
              className="h-11 px-5 items-center justify-center rounded-xl bg-primary"
              onPress={handleRedeem}
              activeOpacity={0.85}
            >
              <Text className="text-sm font-semibold text-white">兑换</Text>
            </TouchableOpacity>
          </View>
          {redeemResult ? (
            <Text className="text-sm text-success mt-2">{redeemResult}</Text>
          ) : null}
          {redeemError ? (
            <Text className="text-sm text-destructive mt-2">{redeemError}</Text>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}
