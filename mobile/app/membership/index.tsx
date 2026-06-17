import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, Crown, Check } from "lucide-react-native";
import { useFetch } from "@/lib/hooks";
import { fetchAPI } from "@/lib/api";
import { useState } from "react";

interface Plan {
  product_type: string;
  name: string;
  price: number;
  original_price: number;
  description: string;
}

interface Subscription {
  plan: string;
  status: string;
  started_at: string;
  expire_at: string;
  auto_renew: boolean;
  days_remaining: number;
}

export default function MembershipScreen() {
  const router = useRouter();
  const { data: plans } = useFetch<Plan[]>("/payment/plans");
  const { data: sub } = useFetch<Subscription | null>("/subscription/current");
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponMsg, setCouponMsg] = useState("");

  async function handlePurchase(productType: string) {
    setPurchasing(productType);
    try {
      await fetchAPI("/payment/create", {
        method: "POST",
        body: JSON.stringify({ product_type: productType }),
      });
      // 支付创建成功后，实际需要调起微信支付
      // 此处为占位 — 真实实现需要对接微信支付 SDK
    } catch {} finally {
      setPurchasing(null);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 border-b border-border bg-white">
          <TouchableOpacity onPress={() => router.back()} className="p-1">
            <ArrowLeft size={20} color="#1c1917" />
          </TouchableOpacity>
          <Text className="flex-1 text-center text-base font-semibold text-foreground">
            会员中心
          </Text>
          <View className="w-7" />
        </View>

        {/* Current Status */}
        {sub && sub.status === "active" && (
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            className="mx-6 mt-6"
          >
            <LinearGradient
              colors={["#f59e0b", "#d97706"]}
              className="rounded-xl p-5"
            >
              <View className="flex-row items-center gap-2 mb-2">
                <Crown size={16} color="#fff" />
                <Text className="text-white font-semibold">当前会员</Text>
              </View>
              <Text className="text-white/80 text-sm">
                {sub.plan === "monthly" ? "月卡" : "年卡"} · 剩余 {sub.days_remaining} 天
              </Text>
              <Text className="text-white/60 text-xs mt-1">
                到期时间: {new Date(sub.expire_at).toLocaleDateString()}
              </Text>
            </LinearGradient>
          </MotiView>
        )}

        {/* Plans */}
        <View className="px-6 mt-6 gap-3">
          <Text className="text-lg font-bold text-foreground mb-2">选择方案</Text>
          {plans?.map((plan, index) => (
            <MotiView
              key={plan.product_type}
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 300, delay: index * 80 }}
            >
              <TouchableOpacity
                className="rounded-xl border border-border bg-white p-5"
                onPress={() => handlePurchase(plan.product_type)}
                disabled={purchasing !== null}
                activeOpacity={0.8}
              >
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-base font-semibold text-foreground">
                      {plan.name}
                    </Text>
                    <Text className="text-xs text-muted-foreground mt-1">
                      {plan.description}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-xl font-bold text-primary">
                      ¥{plan.price}
                    </Text>
                    {plan.original_price > plan.price && (
                      <Text className="text-xs text-muted-foreground line-through">
                        ¥{plan.original_price}
                      </Text>
                    )}
                  </View>
                </View>
                {purchasing === plan.product_type && (
                  <ActivityIndicator size="small" color="#d97706" className="mt-2" />
                )}
              </TouchableOpacity>
            </MotiView>
          ))}
        </View>

        {/* Features */}
        <View className="px-6 mt-6">
          <Text className="text-sm font-semibold text-foreground mb-3">会员权益</Text>
          {["无限面试次数", "完整评估报告", "AI 深度追问", "语音面试模式"].map((f) => (
            <View key={f} className="flex-row items-center gap-2 mb-2">
              <Check size={14} color="#0d9488" />
              <Text className="text-sm text-muted-foreground">{f}</Text>
            </View>
          ))}
        </View>

        {/* Coupon Redeem */}
        <View className="px-6 mt-6 mb-8">
          <Text className="text-sm font-semibold text-foreground mb-3">优惠券兑换</Text>
          <View className="flex-row gap-2">
            <TextInput
              className="flex-1 h-11 rounded-xl border border-input bg-white px-4 text-base text-foreground"
              placeholder="输入优惠券码"
              placeholderTextColor="#a8a29e"
              value={couponCode}
              onChangeText={setCouponCode}
              maxLength={30}
            />
            <TouchableOpacity
              className="h-11 px-4 items-center justify-center rounded-xl bg-primary"
              onPress={async () => {
                if (!couponCode.trim()) return;
                try {
                  await fetchAPI("/coupon/redeem", {
                    method: "POST",
                    body: JSON.stringify({ code: couponCode.trim() }),
                  });
                  setCouponMsg("兑换成功");
                  setCouponCode("");
                } catch (e: unknown) {
                  setCouponMsg(e instanceof Error ? e.message : "兑换失败");
                }
              }}
              activeOpacity={0.85}
            >
              <Text className="text-sm font-semibold text-white">兑换</Text>
            </TouchableOpacity>
          </View>
          {couponMsg ? (
            <Text className="text-xs text-muted-foreground mt-2">{couponMsg}</Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
