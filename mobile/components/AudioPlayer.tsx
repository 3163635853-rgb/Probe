import { useState } from "react";
import { TouchableOpacity, ActivityIndicator } from "react-native";
import { Volume2, VolumeX } from "lucide-react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { getToken } from "@/lib/auth";
import { BASE_URL } from "@/lib/api";

interface AudioPlayerProps {
  text: string;
  size?: number;
}

export function AudioPlayer({ text, size = 16 }: AudioPlayerProps) {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [loading, setLoading] = useState(false);

  async function handlePress() {
    if (loading) return;
    if (status.playing) {
      player.pause();
      await player.seekTo(0);
      return;
    }

    setLoading(true);
    try {
      const token = await getToken();
      const truncated = text.length > 500 ? text.slice(0, 500) : text;
      const url = `${BASE_URL}/speech/tts?text=${encodeURIComponent(truncated)}`;
      player.replace({
        uri: url,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      player.play();
    } finally {
      setLoading(false);
    }
  }

  if (loading || status.isBuffering) {
    return <ActivityIndicator size="small" color="#d97706" />;
  }

  return (
    <TouchableOpacity onPress={handlePress} disabled={loading} activeOpacity={0.7} className="p-1">
      {status.playing ? (
        <VolumeX size={size} color="#d97706" />
      ) : (
        <Volume2 size={size} color="#a8a29e" />
      )}
    </TouchableOpacity>
  );
}
