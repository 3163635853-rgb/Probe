import { useState, useEffect } from "react";
import { View, TouchableOpacity, ActivityIndicator, Platform } from "react-native";
import { MotiView } from "moti";
import { Mic, MicOff } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
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
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    return () => {
      void recorder.stop().catch(() => undefined);
    };
  }, [recorder]);

  async function beginRecording() {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) throw new Error("需要麦克风权限才能录音");
    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setIsRecording(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function finishRecording() {
    setIsRecording(false);
    setUploading(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      const uri = recorder.uri;
      if (!uri) throw new Error("录音文件生成失败");
      const isWeb = Platform.OS === "web";
      const mimeType = isWeb ? "audio/webm" : "audio/m4a";
      const extension = isWeb ? "webm" : "m4a";
      const formData = new FormData();
      formData.append("file", {
        uri,
        name: `recording.${extension}`,
        type: mimeType,
      } as unknown as Blob);
      const result = await uploadFile<TranscribeResponse>("/speech/transcribe", formData);
      if (result.text) onTranscribed(result.text);
    } catch (error: unknown) {
      onError?.(error instanceof Error ? error.message : "语音识别失败");
    } finally {
      setUploading(false);
    }
  }

  async function handlePress() {
    if (disabled || uploading) return;
    try {
      if (isRecording) await finishRecording();
      else await beginRecording();
    } catch (error: unknown) {
      onError?.(error instanceof Error ? error.message : "无法启动录音，请检查麦克风权限");
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
        {isRecording ? <MicOff size={16} color="#fff" /> : <Mic size={16} color="#78716c" />}
      </TouchableOpacity>
    </View>
  );
}
