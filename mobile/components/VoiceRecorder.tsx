import { useState } from "react";
import { View, TouchableOpacity, ActivityIndicator } from "react-native";
import { MotiView } from "moti";
import { Mic, MicOff } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { startRecording, stopRecording } from "@/lib/audio";
import { uploadFile } from "@/lib/api";

interface VoiceRecorderProps {
  onTranscribed: (text: string) => void;
  onError?: (msg: string) => void;
  disabled?: boolean;
}

interface TranscribeResponse {
  text: string;
  duration_sec: number;
}

export function VoiceRecorder({ onTranscribed, onError, disabled }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function handlePress() {
    if (disabled) return;

    if (isRecording) {
      setIsRecording(false);
      setUploading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      try {
        const { uri, mimeType } = await stopRecording();
        const ext = mimeType === "audio/m4a" ? "m4a" : "webm";

        const formData = new FormData();
        formData.append("file", {
          uri,
          name: `recording.${ext}`,
          type: mimeType,
        } as unknown as Blob);

        const result = await uploadFile<TranscribeResponse>(
          "/speech/transcribe",
          formData
        );
        if (result.text) {
          onTranscribed(result.text);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "语音识别失败";
        onError?.(msg);
      } finally {
        setUploading(false);
      }
    } else {
      try {
        await startRecording();
        setIsRecording(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        onError?.("无法启动录音，请检查麦克风权限");
      }
    }
  }

  if (uploading) {
    return (
      <View className="h-10 w-10 items-center justify-center">
        <ActivityIndicator size="small" color="#d97706" />
      </View>
    );
  }

  return (
    <View className="items-center justify-center">
      {isRecording && (
        <MotiView
          from={{ opacity: 0.6, scale: 1 }}
          animate={{ opacity: 0, scale: 1.8 }}
          transition={{ type: "timing", duration: 1200, loop: true }}
          className="absolute h-10 w-10 rounded-full bg-destructive"
        />
      )}
      <TouchableOpacity
        className={`h-10 w-10 items-center justify-center rounded-full ${
          isRecording ? "bg-destructive" : "bg-secondary"
        }`}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        {isRecording ? (
          <MicOff size={16} color="#fff" />
        ) : (
          <Mic size={16} color="#78716c" />
        )}
      </TouchableOpacity>
    </View>
  );
}
