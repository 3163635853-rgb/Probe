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

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  async function handlePress() {
    // 防止 loading 中重复点击
    if (loading) return;

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
      const truncated = text.length > 500 ? text.slice(0, 500) : text;
      const url = `${BASE_URL}/speech/tts?text=${encodeURIComponent(truncated)}`;

      // 先创建 Sound 但不自动播放，注册 listener 后再播放
      const { sound } = await Audio.Sound.createAsync(
        { uri: url, headers: token ? { Authorization: `Bearer ${token}` } : {} },
        { shouldPlay: false }
      );

      // 注册回调 BEFORE 播放，防止短音频错过 didJustFinish
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlaying(false);
          sound.unloadAsync();
          soundRef.current = null;
        }
      });

      soundRef.current = sound;
      setPlaying(true);
      setLoading(false);

      // 开始播放（若组件已卸载，catch 静默处理）
      try {
        await sound.playAsync();
      } catch {
        // sound 可能已被 cleanup effect unload，静默
      }
    } catch {
      setLoading(false);
    }
  }

  if (loading) {
    return <ActivityIndicator size="small" color="#d97706" />;
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={loading}
      activeOpacity={0.7}
      className="p-1"
    >
      {playing ? (
        <VolumeX size={size} color="#d97706" />
      ) : (
        <Volume2 size={size} color="#a8a29e" />
      )}
    </TouchableOpacity>
  );
}
