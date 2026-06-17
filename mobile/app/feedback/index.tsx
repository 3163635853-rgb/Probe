import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, Send, CheckCircle } from "lucide-react-native";
import { fetchAPI } from "@/lib/api";

export default function FeedbackScreen() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(5);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!content.trim() || loading) return;
    setError("");
    setLoading(true);
    try {
      await fetchAPI("/feedback", {
        method: "POST",
        body: JSON.stringify({ comment: content.trim(), rating, feedback_type: "suggestion" }),
      });
      setSubmitted(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "提交失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-8">
        <MotiView
          from={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 12 }}
          className="items-center"
        >
          <CheckCircle size={48} color="#0d9488" />
          <Text className="mt-4 text-lg font-semibold text-foreground">
            感谢反馈
          </Text>
          <Text className="mt-2 text-sm text-muted-foreground text-center">
            我们会认真阅读每一条建议
          </Text>
          <TouchableOpacity
            className="mt-8 h-11 px-8 items-center justify-center rounded-xl bg-primary"
            onPress={() => router.back()}
          >
            <Text className="text-sm font-semibold text-white">返回</Text>
          </TouchableOpacity>
        </MotiView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 border-b border-border bg-white">
          <TouchableOpacity onPress={() => router.back()} className="p-1">
            <ArrowLeft size={20} color="#1c1917" />
          </TouchableOpacity>
          <Text className="flex-1 text-center text-base font-semibold text-foreground">
            帮助与反馈
          </Text>
          <View className="w-7" />
        </View>

        {/* Content */}
        <View className="flex-1 px-6 pt-6">
          <Text className="text-sm text-muted-foreground mb-3">
            告诉我们你的想法、问题或建议
          </Text>
          <TextInput
            className="flex-1 max-h-64 rounded-xl border border-input bg-white p-4 text-base text-foreground"
            placeholder="请输入反馈内容..."
            placeholderTextColor="#a8a29e"
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            maxLength={2000}
          />
          <Text className="text-right text-xs text-muted-foreground mt-2">
            {content.length} / 2000
          </Text>
          {error ? (
            <Text className="text-sm text-destructive mt-2">{error}</Text>
          ) : null}
        </View>

        {/* Submit */}
        <View className="px-6 pb-6">
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!content.trim() || loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={content.trim() ? ["#f59e0b", "#d97706"] : ["#e7e5e4", "#d6d3d1"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="h-13 flex-row items-center justify-center gap-2 rounded-xl py-4"
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Send size={16} color={content.trim() ? "#fff" : "#a8a29e"} />
                  <Text
                    className={`text-base font-semibold ${
                      content.trim() ? "text-white" : "text-muted-foreground"
                    }`}
                  >
                    提交反馈
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
