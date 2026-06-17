import { View, Text } from "react-native";
import { MotiView } from "moti";
import { AudioPlayer } from "./AudioPlayer";

interface ChatBubbleProps {
  role: "ai" | "user";
  content: string;
  score?: number;
  index?: number;
}

export function ChatBubble({ role, content, score, index = 0 }: ChatBubbleProps) {
  const isAI = role === "ai";

  return (
    <MotiView
      from={{ opacity: 0, translateY: 8, scale: 0.97 }}
      animate={{ opacity: 1, translateY: 0, scale: 1 }}
      transition={{ type: "spring", damping: 18, delay: index * 30 }}
      className={`mb-3 max-w-[85%] ${isAI ? "self-start" : "self-end"}`}
    >
      {/* Label + TTS */}
      <View className={`flex-row items-center gap-2 mb-1 ${isAI ? "" : "justify-end"}`}>
        <Text className="text-[10px] text-muted-foreground">
          {isAI ? "AI 面试官" : "我"}
        </Text>
        {isAI && <AudioPlayer text={content} size={12} />}
      </View>

      {/* Bubble */}
      <View
        className={`rounded-2xl px-4 py-3 ${
          isAI
            ? "bg-white border border-border rounded-tl-sm"
            : "bg-primary rounded-tr-sm"
        }`}
        style={
          isAI
            ? {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 3,
                elevation: 1,
              }
            : undefined
        }
      >
        <Text
          className={`text-[15px] leading-6 ${
            isAI ? "text-foreground" : "text-white"
          }`}
        >
          {content}
        </Text>
      </View>

      {/* Score Badge */}
      {score !== undefined && (
        <MotiView
          from={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 12, delay: 200 }}
          className="self-end mt-1"
        >
          <View className="flex-row items-center gap-1 rounded-full bg-accent px-2 py-0.5">
            <Text className="text-[10px] font-bold text-accent-foreground">
              {score} 分
            </Text>
          </View>
        </MotiView>
      )}
    </MotiView>
  );
}
