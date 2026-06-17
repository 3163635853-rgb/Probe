import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MotiView } from "moti";
import * as Haptics from "expo-haptics";
import { Send, SkipForward, X, ArrowLeft, WifiOff } from "lucide-react-native";
import { fetchAPI, BASE_URL } from "@/lib/api";
import { createSSE, type SSEConnectionState } from "@/lib/sse";
import { ChatBubble } from "@/components/ChatBubble";
import { VoiceRecorder } from "@/components/VoiceRecorder";

interface Message {
  id: string;
  role: "ai" | "user";
  content: string;
  score?: number;
}

const INPUT_MAX_LENGTH = 5000;

export default function InterviewScreen() {
  const { uuid } = useLocalSearchParams<{ uuid: string }>();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [connState, setConnState] = useState<SSEConnectionState>("connecting");
  const [round, setRound] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const flatListRef = useRef<FlatList>(null);
  const sseRef = useRef<{ close: () => void } | null>(null);

  useEffect(() => {
    const streamUrl = `${BASE_URL}/interview/${uuid}/stream`;
    const sse = createSSE(streamUrl, {
      onQuestion(data) {
        setThinking(false);
        setRound(data.round);
        setMessages((prev) => [
          ...prev,
          { id: `q-${data.round}`, role: "ai", content: data.content },
        ]);
      },
      onEvaluation(data) {
        if (data.visible) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id.startsWith(`a-${data.round}-`) ? { ...m, score: data.score } : m
            )
          );
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      },
      onThinking() {
        setThinking(true);
      },
      onReport() {
        router.replace(`/interview/${uuid}/report`);
      },
      onError(data) {
        setError(data.message || "面试出现错误");
      },
      onStateChange(s) {
        setConnState(s);
      },
      onDone() {
        setConnState("closed");
      },
    });
    sseRef.current = sse;
    return () => { sse.close(); };
  }, [uuid, router]);

  // 消息更新时自动滚动到底部（通过 onContentSizeChange 替代 setTimeout）
  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  }, []);

  const handleSend = useCallback(async (text?: string) => {
    const content = (text || input).trim();
    if (!content || sending) return;
    setInput("");
    setSending(true);
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const msgId = `a-${round}-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: msgId, role: "user", content },
    ]);
    try {
      await fetchAPI(`/interview/${uuid}/answer`, {
        method: "POST",
        body: JSON.stringify({ content, type: "text" }),
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "发送失败");
    } finally {
      setSending(false);
    }
  }, [input, sending, round, uuid]);

  const handleSkip = useCallback(async () => {
    if (actionLoading) return;
    setActionLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await fetchAPI(`/interview/${uuid}/skip`, { method: "POST" });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "跳过失败");
    } finally {
      setActionLoading(false);
    }
  }, [actionLoading, uuid]);

  const handleEnd = useCallback(() => {
    Alert.alert("结束面试", "确定要结束当前面试吗？结束后将生成报告。", [
      { text: "取消", style: "cancel" },
      {
        text: "确定结束",
        style: "destructive",
        onPress: async () => {
          setActionLoading(true);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          try {
            await fetchAPI(`/interview/${uuid}/end`, { method: "POST" });
          } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "结束失败");
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  }, [uuid]);

  const isConnected = connState === "connected";

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-border px-4 py-3 bg-white">
          <Pressable onPress={() => router.back()} className="p-1">
            <ArrowLeft size={20} color="#1c1917" />
          </Pressable>
          <View className="items-center">
            <Text className="text-sm font-semibold text-foreground">
              面试进行中
            </Text>
            <Text className="text-xs text-muted-foreground">
              第 {round} 题
            </Text>
          </View>
          <View className="flex-row items-center gap-3">
            <Pressable onPress={handleSkip} disabled={actionLoading} className="p-1">
              <SkipForward size={18} color={actionLoading ? "#d6d3d1" : "#78716c"} />
            </Pressable>
            <Pressable onPress={handleEnd} disabled={actionLoading} className="p-1">
              <X size={18} color={actionLoading ? "#d6d3d1" : "#dc2626"} />
            </Pressable>
          </View>
        </View>

        {/* Connection/Error Banner */}
        {connState === "reconnecting" && (
          <MotiView
            from={{ opacity: 0, translateY: -10 }}
            animate={{ opacity: 1, translateY: 0 }}
            className="bg-accent px-4 py-2 flex-row items-center justify-center gap-2"
          >
            <ActivityIndicator size="small" color="#92400e" />
            <Text className="text-xs text-accent-foreground">重新连接中...</Text>
          </MotiView>
        )}
        {connState === "failed" && (
          <View className="bg-destructive/10 px-4 py-3 items-center gap-2">
            <View className="flex-row items-center gap-2">
              <WifiOff size={12} color="#dc2626" />
              <Text className="text-xs text-destructive">连接失败，请检查网络</Text>
            </View>
            <TouchableOpacity
              onPress={() => router.replace("/(main)/home")}
              className="mt-1 px-4 py-1.5 rounded-full bg-destructive"
            >
              <Text className="text-xs text-white font-medium">返回首页</Text>
            </TouchableOpacity>
          </View>
        )}
        {error ? (
          <View className="bg-destructive/10 px-4 py-1.5">
            <Text className="text-xs text-destructive text-center">{error}</Text>
          </View>
        ) : null}

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <ChatBubble
              role={item.role}
              content={item.content}
              score={item.score}
              index={index}
            />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          onContentSizeChange={scrollToBottom}
          className="flex-1"
          ListFooterComponent={thinking ? <TypingIndicator /> : null}
        />

        {/* Input Area */}
        <View className="border-t border-border bg-white px-4 py-3">
          <View className="flex-row items-end gap-2">
            <VoiceRecorder
              onTranscribed={(text) => handleSend(text)}
              onError={(msg) => setError(msg)}
              disabled={!isConnected}
            />
            <TextInput
              className="flex-1 max-h-24 rounded-2xl border border-input bg-secondary/50 px-4 py-2.5 text-[15px] text-foreground"
              placeholder="输入你的回答..."
              placeholderTextColor="#a8a29e"
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={INPUT_MAX_LENGTH}
              editable={isConnected}
            />
            <TouchableOpacity
              className={`h-10 w-10 items-center justify-center rounded-full ${
                input.trim() && !sending ? "bg-primary" : "bg-muted"
              }`}
              onPress={() => handleSend()}
              disabled={!input.trim() || sending || !isConnected}
              activeOpacity={0.8}
            >
              {sending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Send size={16} color={input.trim() ? "#fff" : "#a8a29e"} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TypingIndicator() {
  return (
    <MotiView
      from={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="self-start mb-3"
    >
      <View className="flex-row items-center gap-1.5 rounded-2xl rounded-tl-sm bg-white border border-border px-4 py-3">
        {[0, 1, 2].map((i) => (
          <MotiView
            key={i}
            from={{ opacity: 0.3, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              type: "timing",
              duration: 500,
              delay: i * 150,
              loop: true,
            }}
            className="h-2 w-2 rounded-full bg-muted-foreground"
          />
        ))}
      </View>
    </MotiView>
  );
}
