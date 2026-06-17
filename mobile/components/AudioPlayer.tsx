import { useState, useRef, useEffect } from "react";
import { TouchableOpacity, ActivityIndicator } from "react-native";
import { Volume2, VolumeX } from "lucide-react-native";
import { Audio } from "expo-av";
import { getToken } from "@/lib/auth";
import { BASE_URL } from "@/lib/api";

interface AudioPlayerProps {
  text: string;
  size?: number;
}

export function AudioPlayer({ text, size = 16 }: AudioPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  // 组件卸载时清理音频
  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  async function handlePress() {
    if (playing) {
      await soundRef.current?.stopAsync();
      await soundRef.current?.unloadAsync();
      soundRef.current = null;
      setPlaying(false);
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      // 截断到 500 字符防止 URL 过长
      const truncated = text.length > 500 ? text.slice(0, 500) : text;
      const url = `${BASE_URL}/speech/tts?text=${encodeURIComponent(truncated)}`;
      const { sound } = await Audio.Sound.createAsync(
        { uri: url, headers: token ? { Authorization: `Bearer ${token}` } : {} },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      setPlaying(true);
      setLoading(false);

      // 播放完毕回调
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlaying(false);
          sound.unloadAsync();
          soundRef.current = null;
        }
      });
    } catch {
      setLoading(false);
    }
  }

  if (loading) {
    return <ActivityIndicator size="small" color="#d97706" />;
  }

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7} className="p-1">
      {playing ? (
        <VolumeX size={size} color="#d97706" />
      ) : (
        <Volume2 size={size} color="#a8a29e" />
      )}
    </TouchableOpacity>
  );
}
